import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!geminiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing server environment configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Authenticate user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Session expired or invalid" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { messages, tab_context } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Server-Side Rate Limiting (5-Message Cap) with Graceful Upsert Fallback
    const { data: initialProfile, error: profileError } = await supabase
      .from("users")
      .select("plan, ai_message_count, last_message_date")
      .eq("id", user.id)
      .single();

    let userData = initialProfile;

    // If no profile exists, automatically create a default free tier profile inside users table
    if (profileError || !initialProfile) {
      const { data: newProfile, error: insertError } = await supabase
        .from("users")
        .insert([{ 
            id: user.id, 
            email: user.email || "",
            plan: 'free', 
            ai_message_count: 0, 
            last_message_date: new Date().toISOString() 
        }])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to initialize user profile: ${insertError.message}`);
      }
      userData = newProfile;
    }

    const isFree = userData.plan === "free" || !userData.plan;
    let finalMessageCount = userData.ai_message_count || 0;

    if (isFree) {
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const lastMsgDateStr = userData.last_message_date 
        ? new Date(userData.last_message_date).toISOString().split("T")[0] 
        : null;

      // Reset count if it's a new day
      if (!lastMsgDateStr || lastMsgDateStr < todayStr) {
        finalMessageCount = 0;
      }

      if (finalMessageCount >= 5) {
        return new Response(
          JSON.stringify({
            error: "You've reached your daily limit of 5 messages.",
            code: "LIMIT_REACHED",
            ai_message_count: finalMessageCount
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const userPromptMsg = messages[messages.length - 1];
    const userPrompt = userPromptMsg?.content || "";

    // 3. RAG: Notes Similarity Search / Keyword Fallback
    let notesContext = "";
    const hasNoteKeywords = 
      userPrompt.toLowerCase().includes("note") || 
      userPrompt.toLowerCase().includes("idea") || 
      userPrompt.toLowerCase().includes("remember") || 
      userPrompt.toLowerCase().includes("wrote") || 
      userPrompt.toLowerCase().includes("summary");

    if (hasNoteKeywords) {
      try {
        // Try getting embedding first
        const embedRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "models/text-embedding-004",
              content: { parts: [{ text: userPrompt }] }
            })
          }
        );

        if (embedRes.ok) {
          const embedJson = await embedRes.json();
          const embedding = embedJson.embedding?.values;
          if (embedding) {
            // Run pgvector similarity RPC
            const { data: matchedNotes, error: matchError } = await supabase.rpc("match_notes", {
              query_embedding: embedding,
              match_threshold: 0.3,
              match_count: 3,
              p_user_id: user.id
            });

            if (!matchError && matchedNotes && matchedNotes.length > 0) {
              notesContext = matchedNotes
                .map((n: any) => `[Note Title: "${n.title}"]\nContent: ${n.content || ""}`)
                .join("\n\n");
            }
          }
        }
      } catch (err) {
        console.error("pgvector search error, falling back to recent notes:", err);
      }

      // Fallback: Fetch user's latest 3 notes
      if (!notesContext) {
        try {
          const { data: recentNotes } = await supabase
            .from("notes")
            .select("title, content")
            .eq("user_id", user.id)
            .eq("is_deleted", false)
            .order("updated_at", { ascending: false })
            .limit(3);

          if (recentNotes && recentNotes.length > 0) {
            notesContext = recentNotes
              .map((n: any) => `[Note Title: "${n.title}"]\nContent: ${n.content || ""}`)
              .join("\n\n");
          }
        } catch (err) {
          console.error("Notes fallback failed:", err);
        }
      }
    }

    // 4. Construct System Instructions & Persona
    const currentDate = new Date();
    const todayString = currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const catalystSystemInstruction = `You are an algorithmic routing engine for a productivity app. You are NOT a conversational assistant.

SYSTEM DIRECTIVE & TEMPORAL ANCHORING:
- Today's date context is Saturday, June 13, 2026.
- You must evaluate all day and date expressions relative to this exact anchor day. (e.g., If the user requests "Monday", you must output "2026-06-15" directly into the tool parameters).

AUTOMATIC VALUE RESOLUTION:
- If the user commands you to add a reminder for a specific weekday/time but does not supply a specific repetition strategy, you must automatically assign 'Never' to the 'repeat' parameters. Do not ask for confirmation.
- Map parameters explicitly to the matching database schema layout details:
  * title: String text title description
  * day: String formatted date as 'YYYY-MM-DD'
  * start_time: String formatted hour text like '03:00 PM' or '08:30 AM'
  * repeat: Defaults directly to 'Never'

CRITICAL DIRECTIVES:
1. ZERO CHATTER: NEVER provide motivational advice, behavioral science insights, or book quotes (e.g., Charles Duhigg, James Clear). NEVER say "I can help you with that." 
2. SILENT EXECUTION: If you successfully call a tool, your text response MUST be a single, short confirmation sentence (e.g., "Habit added.", "Reminder set.").
3. AUTOMATIC DATE MATH: NEVER ask the user to provide a specific YYYY-MM-DD date. It is strictly forbidden. If the user says "Monday", you MUST internally calculate the date for the upcoming Monday and pass it directly to the tool. 
4. DEFAULTS: If a user asks to set a reminder but does not specify a repeat frequency, default the frequency/repeat mode to 'Never'.

CRITICAL ROUTING RULES (TASKS VS. REMINDERS):
- If the user provides a specific hour or time reference (e.g., "at 3 PM", "8:30am") OR uses words like "remind", "reminder", or "alert", you MUST call the \`add_reminder\` tool.
- If the user specifies a day or general target date (e.g., "tomorrow", "on Friday", "by next week") WITHOUT specifying an exact time of day, you MUST call the \`add_task\` tool. 

EXAMPLE 1:
User: "Add habit: chess"
Action: Call \`add_habit({ title: "chess" })\`
Response: "Chess added to your daily habits."

EXAMPLE 2:
User: "Add reminder on Monday 8 am exam pct"
Action: Call \`add_reminder({ title: "exam pct", day: "2026-06-15", start_time: "08:00 AM", repeat: "Never" })\`
Response: "Reminder set for Monday at 8 AM."

${notesContext ? `Relevant user notes context (cite document titles if used):\n${notesContext}\n` : ''}`;

    // 5. Initialize Gemini SDK (npm:@google/generative-ai)
    const genAI = new GoogleGenerativeAI(geminiKey);
    const tools = [{
      functionDeclarations: [
        { name: "add_task", description: "Adds a task to the to-do list", parameters: { type: "OBJECT", properties: { title: { type: "STRING" }, due_date: { type: "STRING" } }, required: ["title"] } },
        { name: "add_habit", description: "Adds a new habit to track", parameters: { type: "OBJECT", properties: { title: { type: "STRING" } }, required: ["title"] } },
        { 
          name: "add_reminder", 
          description: "Sets a reminder. Calculate the exact YYYY-MM-DD date based on today's date. Default repeat to 'Never' if not specified.", 
          parameters: { 
            type: "OBJECT", 
            properties: { 
              title: { type: "STRING", description: "The reminder title" }, 
              day: { type: "STRING", description: "YYYY-MM-DD format date, calculated automatically from relative references" }, 
              start_time: { type: "STRING", description: "e.g., 08:00 AM" },
              repeat: { type: "STRING", description: "Repeat frequency. Defaults to 'Never'. Options: Never, Daily, Weekly, Monthly" }
            }, 
            required: ["title", "day", "start_time"] 
          } 
        },
        { name: "add_countdown", description: "Sets a countdown for a future event", parameters: { type: "OBJECT", properties: { event_name: { type: "STRING" }, target_date: { type: "STRING" } }, required: ["event_name", "target_date"] } },
        { 
          name: "get_habit_details", 
          description: "Fetches user's habit streaks and frequency.", 
          parameters: { 
            type: "OBJECT", 
            properties: { 
              habit_name: { type: "STRING" } 
            }, 
            required: ["habit_name"] 
          } 
        }
      ]
    }];
    const model = genAI.getGenerativeModel({
      model: "gemini-3.8-flash",
      systemInstruction: catalystSystemInstruction,
      tools: tools
    });

    // Format history for the SDK
    const contentsToSend = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    // First generate content call
    let responseResult: any;
    try {
      responseResult = await model.generateContent({
        contents: contentsToSend,
        generationConfig: {
          temperature: 0.15,
        },
      });
    } catch (genErr: any) {
      const errMsg = genErr?.message || '';
      if (errMsg.includes('503') || errMsg.includes('500') || errMsg.toLowerCase().includes('overloaded') || errMsg.toLowerCase().includes('unavailable')) {
        return new Response(
          JSON.stringify({ error: "Focalyst AI is currently experiencing high demand. Please try again in a moment." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw genErr;
    }

    let responseContent = responseResult.response;
    let part = responseContent.candidates?.[0]?.content?.parts?.[0];

    // Check for Function Call
    if (part?.functionCall) {
      const { name, args } = part.functionCall;
      console.log(`Executing SDK tool: ${name} with args:`, args);

      let toolResult: any = null;

      try {
        if (name === "add_task") {
          const { title, due_date } = args;

          // Defensive guard: ensure title is a clean string and not an email address
          const safeTitle = typeof title === 'string' ? title.trim() : '';
          if (!safeTitle || safeTitle.includes('@') || safeTitle.length < 1) {
            toolResult = { success: false, error: 'Invalid task title received from AI model.' };
          } else {
            const { data, error } = await supabase
              .from("tasks")
              .insert({
                user_id: user.id,
                title: safeTitle,
                due_date: due_date || null,
                priority: "medium"
              })
              .select()
              .single();

            if (error) throw error;
            toolResult = { success: true, message: `Task "${safeTitle}" created successfully!`, task: data };
          }
        } 
        else if (name === "add_habit") {
          const { title, frequency } = args;
          const { data, error } = await supabase
            .from("habits")
            .insert({
              user_id: user.id,
              name: title,
              icon: "⭐",
              frequency: frequency || "everyday",
              is_active: true,
            })
            .select()
            .single();

          if (error) throw error;
          toolResult = { success: true, message: `Habit "${title}" created successfully!`, habit: data };
        }
        else if (name === "add_reminder") {
          const { title, day, start_time, repeat } = args;
          const reminderDate = day || new Date().toISOString().split('T')[0];
          let startTimeString = start_time || '08:00 AM';
          const repeatValue = repeat || 'Never';
          
          // Generate an end time that is 1 hour later than start_time
          let endTimeString = '09:00 AM';
          if (startTimeString) {
            const matches = startTimeString.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (matches) {
              let h = parseInt(matches[1], 10);
              const m = parseInt(matches[2], 10);
              const ampm = matches[3] ? matches[3].toUpperCase() : null;
              
              if (ampm === 'PM' && h < 12) h += 12;
              if (ampm === 'AM' && h === 12) h = 0;
              
              const nextH = (h + 1) % 24;
              
              const displayH = nextH === 0 ? 12 : (nextH > 12 ? nextH - 12 : nextH);
              const displayAmpm = nextH >= 12 ? 'PM' : 'AM';
              endTimeString = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${displayAmpm}`;
            } else {
              const parts = startTimeString.split(':');
              if (parts.length >= 2) {
                const h = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10);
                const nextH = (h + 1) % 24;
                endTimeString = `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              }
            }
          }

          const { data, error } = await supabase
            .from("reminders")
            .insert({
              user_id: user.id,
              title,
              day: reminderDate,
              all_day: false,
              start_time: startTimeString,
              end_time: endTimeString,
              repeat: repeatValue,
              repeat_mode: repeatValue,
            })
            .select()
            .single();

          if (error) throw error;
          toolResult = { success: true, message: `Reminder "${title}" set for ${reminderDate} at ${startTimeString}!`, reminder: data };
        } 
        else if (name === "add_countdown") {
          const { event_name, target_date } = args;
          const { data, error } = await supabase
            .from("countdowns")
            .insert({
              user_id: user.id,
              event_name: event_name.trim(),
              target_date: target_date,
              is_active: true,
            })
            .select()
            .single();

          if (error) throw error;
          toolResult = { success: true, message: `Countdown "${event_name}" created successfully!`, countdown: data };
        } 
        else if (name === "get_habit_details") {
          const { data, error } = await supabase
            .from('habits')
            .select('name, current_streak, longest_streak, frequency')
            .ilike('name', `%${args.habit_name}%`)
            .single();

          if (error) throw error;
          toolResult = data;
        }
        else if (name === "get_weekly_metrics") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const startStr = sevenDaysAgo.toISOString();

          const [focusRes, tasksRes, habitsRes] = await Promise.all([
            supabase.from("pomodoro_sessions").select("focus_minutes, sets_completed").eq("user_id", user.id).gte("completed_at", startStr),
            supabase.from("tasks").select("id, is_completed, completed_at").eq("user_id", user.id),
            supabase.from("habits").select("name, current_streak").eq("user_id", user.id).eq("is_active", true)
          ]);

          const focusMins = focusRes.data?.reduce((acc: number, curr: any) => acc + ((curr.focus_minutes || 0) * (curr.sets_completed || 0)), 0) || 0;
          
          const completedTasks = tasksRes.data?.filter((t: any) => 
            t.is_completed && t.completed_at && new Date(t.completed_at) >= sevenDaysAgo
          ).length || 0;

          const activeHabits = habitsRes.data?.map((h: any) => `${h.name} (streak: ${h.current_streak} days)`).join(", ") || "None active";

          toolResult = {
            success: true,
            focusMinutesThisWeek: focusMins,
            tasksCompletedThisWeek: completedTasks,
            activeHabitStreaks: activeHabits
          };
        }
      } catch (err) {
        console.error(`Error executing tool ${name}:`, err);
        toolResult = { success: false, error: err.message || "Database execution failed" };
      }

      // Feed back the function/tool result to get a final conversational reply
      const followUpContents = [
        ...contentsToSend,
        responseContent.candidates[0].content, // Send the original tool request back
        {
          role: "function",
          parts: [{
            functionResponse: {
              name,
              response: { result: toolResult }
            }
          }]
        }
      ];

      // Second SDK invoke call
      let followUpResult: any;
      try {
        followUpResult = await model.generateContent({
          contents: followUpContents
        });
      } catch (genErr2: any) {
        const errMsg2 = genErr2?.message || '';
        if (errMsg2.includes('503') || errMsg2.includes('500') || errMsg2.toLowerCase().includes('overloaded') || errMsg2.toLowerCase().includes('unavailable')) {
          return new Response(
            JSON.stringify({ error: "Focalyst AI is currently experiencing high demand. Please try again in a moment." }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw genErr2;
      }
      responseResult = followUpResult;
      responseContent = responseResult.response;
      part = responseContent.candidates?.[0]?.content?.parts?.[0];
    }

    const aiResponseText = part?.text || "I apologize, but I encountered an issue processing that response.";

    // 6. Update user's message usage logs on success for Free Plan
    if (isFree) {
      await supabase
        .from("users")
        .update({
          ai_message_count: finalMessageCount + 1,
          last_message_date: new Date().toISOString()
        })
        .eq("id", user.id);
    }

    // 7. Log both messages in ai_chat_logs for context tracking
    try {
      await supabase.from("ai_chat_logs").insert([
        {
          user_id: user.id,
          role: "user",
          content: userPrompt,
          tab_context: tab_context || null
        },
        {
          user_id: user.id,
          role: "assistant",
          content: aiResponseText,
          tab_context: tab_context || null
        }
      ]);
    } catch (logErr) {
      console.error("Logging messages to ai_chat_logs failed:", logErr);
    }

    // Return final AI response payload
    return new Response(
      JSON.stringify({
        response: aiResponseText,
        ai_message_count: isFree ? finalMessageCount + 1 : 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Edge Function Absolute Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected absolute error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
