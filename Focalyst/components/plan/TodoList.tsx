import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  DeviceEventEmitter,
} from 'react-native';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Crypto from 'expo-crypto';
import { recordMilestoneForReview } from '../../src/services/reviewPromptService';

function getPriorityBadgeStyle(priority: string | undefined, isDark: boolean = false) {
  const normalized = (priority || 'medium').toLowerCase();

  if (normalized === 'high' || normalized === '1') {
    return {
      label: 'High',
      bg: isDark ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2',
      border: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fca5a5',
      text: isDark ? '#f87171' : '#dc2626',
    };
  }

  if (normalized === 'low' || normalized === '3') {
    return {
      label: 'Low',
      bg: isDark ? 'rgba(34, 197, 94, 0.16)' : '#dcfce7',
      border: isDark ? 'rgba(34, 197, 94, 0.35)' : '#86efac',
      text: isDark ? '#4ade80' : '#15803d',
    };
  }

  // Default: Medium
  return {
    label: 'Medium',
    bg: isDark ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe',
    border: isDark ? 'rgba(59, 130, 246, 0.35)' : '#93c5fd',
    text: isDark ? '#60a5fa' : '#1d4ed8',
  };
}

export default function TodoList({
  userId,
  onAddTaskPress,
  onEditTaskPress,
  ListHeaderComponent,
  ListFooterComponent,
}: {
  userId: string;
  onAddTaskPress?: () => void;
  onEditTaskPress?: (task: any) => void;
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
}) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);

  // Store timeouts for active tasks to handle fast check/uncheck toggles
  const timeoutsRef = useRef<Record<string, any>>({});

  useEffect(() => {
    return () => {
      // Clear all active timeouts on unmount
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('position', { ascending: true })
        .order('created_at', { ascending: false });
      if (data) {
        const seen = new Set<string>();
        const unique = data.filter((t: any) => {
          const idStr = String(t.id);
          if (seen.has(idStr)) return false;
          seen.add(idStr);
          return true;
        });
        setTasks(unique);
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const syncTaskOrder = async (newOrderData: any[]) => {
    try {
      const updates = newOrderData.map((task, index) => ({
        id: task.id,
        user_id: userId,
        title: task.title,
        position: index,
      }));

      const { error } = await supabase
        .from('tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
    } catch (e) {
      console.error('Error syncing task order:', e);
    }
  };

  useEffect(() => {
    if (userId) fetchTasks();
  }, [userId]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('refreshTasks', () => {
      if (userId) fetchTasks();
    });
    return () => subscription.remove();
  }, [userId]);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    
    // Instantly update the local state visually to show checkbox check and strikethrough
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, is_completed: nextStatus } : t)));

    if (nextStatus === true) {
      // 1. Clear any existing timeout for this task
      if (timeoutsRef.current[id]) {
        clearTimeout(timeoutsRef.current[id]);
      }

      // 2. Set new timeout for 3500ms
      const timeoutId = setTimeout(async () => {
        try {
          const { error } = await supabase
            .from('tasks')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', id);
          if (error) throw error;
          
          // Remove from local list after the delay completes
          setTasks(prev => prev.filter(t => t.id !== id));
          delete timeoutsRef.current[id];
          void recordMilestoneForReview('todo');
        } catch (e) {
          console.error('Error completing task:', e);
          // Rollback local state on error
          setTasks(prev => prev.map(t => (t.id === id ? { ...t, is_completed: false } : t)));
        }
      }, 3500);

      timeoutsRef.current[id] = timeoutId;
    } else {
      // If the user unchecks the task before 3.5s runs out, clear the timeout so it stays on screen
      if (timeoutsRef.current[id]) {
        clearTimeout(timeoutsRef.current[id]);
        delete timeoutsRef.current[id];
      }

      // Update in Supabase immediately to active status
      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            is_completed: false,
            completed_at: null,
          })
          .eq('id', id);
        if (error) throw error;
      } catch (e) {
        console.error('Error unchecking task:', e);
        // Rollback local state on error
        setTasks(prev => prev.map(t => (t.id === id ? { ...t, is_completed: true } : t)));
      }
    }
  };

  const handleAddTask = async () => {
    if (submitting) return;
    if (!newTitle.trim()) { setIsAdding(false); return; }
    setSubmitting(true);
    try {
      const taskId = Crypto.randomUUID();
      const newTask = {
        id: taskId,
        user_id: userId,
        title: newTitle.trim(),
        is_completed: false,
        tags: [],
        position: 0,
      };
      const { data, error } = await supabase
        .from('tasks')
        .upsert([newTask], { onConflict: 'id' })
        .select();
      if (error) throw error;
      const created = (data && data[0]) ? data[0] : newTask;
      setTasks(prev => {
        const remaining = prev.filter(t => t.id !== created.id);
        return [created, ...remaining];
      });
      setNewTitle('');
      setIsAdding(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete task');
      fetchTasks();
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color="#4a6c8c" style={{ marginVertical: 16 }} />;
  }



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DraggableFlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          setTasks(data);
          syncTaskOrder(data);
        }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 40,
        }}
        ListHeaderComponent={
          <View>
            {ListHeaderComponent}
            <Text style={styles.sectionTitle}>TO-DO List</Text>
          </View>
        }
        ListFooterComponent={
          <View>
            {/* Inline add row */}
            {isAdding && (
              <View style={[styles.taskRow, styles.addingTaskRow, { marginBottom: 14 }]}>
                <View style={{ width: 24, marginRight: 8 }} />
                <View style={[styles.checkbox, { borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' }]} />
                <TextInput
                  style={styles.inlineInput}
                  placeholder="New task…"
                  placeholderTextColor="#94a3b8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  autoFocus
                  onSubmitEditing={handleAddTask}
                  onBlur={() => { if (!newTitle.trim()) setIsAdding(false); }}
                />
                {submitting
                  ? <ActivityIndicator size="small" color="#4a6c8c" style={{ padding: 4 }} />
                  : (
                    <TouchableOpacity onPress={handleAddTask} disabled={submitting} style={[styles.checkButton, submitting && { opacity: 0.5 }]}>
                      <Ionicons name="checkmark-circle" size={22} color="#4a6c8c" />
                    </TouchableOpacity>
                  )}
              </View>
            )}

            {!isAdding && (
              <TouchableOpacity
                style={styles.orangeButton}
                onPress={() => { if (onAddTaskPress) onAddTaskPress(); else setIsAdding(true); }}
                activeOpacity={0.9}
              >
                <Text style={styles.orangeButtonText}>+ Add new task</Text>
              </TouchableOpacity>
            )}

            {ListFooterComponent}
          </View>
        }
        renderItem={({ item, drag, isActive }) => {
          const isMenuOpen = activeMenuTaskId === item.id;
          return (
            <ScaleDecorator>
              <View
                style={[
                  styles.taskRow,
                  isActive && {
                    backgroundColor: '#cbd5e1',
                    shadowColor: '#4a6c8c',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 5,
                  }
                ]}
              >
                <View style={styles.taskLeftSection}>
                  {/* Drag Handle Icon */}
                  <TouchableOpacity
                    onPressIn={drag}
                    disabled={isActive}
                    activeOpacity={0.7}
                    style={styles.dragHandle}
                  >
                    <Ionicons name="reorder-three" size={24} color="#94a3b8" />
                  </TouchableOpacity>

                  {/* Checkbox */}
                  <TouchableOpacity
                    style={[styles.checkbox, item.is_completed && styles.checkboxChecked]}
                    onPress={() => handleToggle(item.id, item.is_completed)}
                    activeOpacity={0.7}
                  >
                    {item.is_completed && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </TouchableOpacity>

                  {/* Title */}
                  <Text numberOfLines={1} style={[styles.taskTitle, item.is_completed && styles.taskTitleCompleted]}>
                    {item.title}
                  </Text>
                </View>

                {/* Right: Priority Capsule + Three-Dot Button */}
                <View style={styles.taskRightGroup}>
                  {(() => {
                    const badge = getPriorityBadgeStyle(item.priority, false);
                    return (
                      <View
                        style={[
                          styles.priorityCapsule,
                          { backgroundColor: badge.bg, borderColor: badge.border },
                        ]}
                      >
                        <Text style={[styles.priorityCapsuleText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    );
                  })()}

                  <TouchableOpacity
                    onPress={() => setActiveMenuTaskId(isMenuOpen ? null : item.id)}
                    activeOpacity={0.7}
                    style={styles.optionsButton}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Context menu in a Modal to escape any clipping */}
                <Modal
                  transparent
                  visible={isMenuOpen}
                  animationType="fade"
                  onRequestClose={() => setActiveMenuTaskId(null)}
                >
                  <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setActiveMenuTaskId(null)}
                  >
                    <View style={styles.modalCenterContainer}>
                      <Pressable onPress={e => e.stopPropagation()} style={styles.modalDropdownMenu}>
                        <Text style={styles.modalMenuTitle}>{item.title}</Text>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity
                          onPress={() => {
                            setActiveMenuTaskId(null);
                            if (onEditTaskPress) onEditTaskPress(item);
                          }}
                          style={styles.menuItem}
                        >
                          <Text style={styles.menuItemText}>Edit</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity
                          onPress={() => { setActiveMenuTaskId(null); handleDeleteTask(item.id); }}
                          style={styles.menuItem}
                        >
                          <Text style={[styles.menuItemText, styles.menuItemDelete]}>Delete</Text>
                        </TouchableOpacity>
                      </Pressable>
                    </View>
                  </Pressable>
                </Modal>
              </View>
            </ScaleDecorator>
          );
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  sectionTitle: { color: '#4a6c8c', fontSize: 18, fontWeight: '700', marginBottom: 14, letterSpacing: -0.2 },
  list: { marginBottom: 14 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbe1ec',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  addingTaskRow: {
    backgroundColor: '#e6ebf4',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  checkbox: {
    width: 22, height: 22,
    borderRadius: 6, borderWidth: 1.5, borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  checkboxChecked: { backgroundColor: '#4a6c8c', borderColor: '#4a6c8c' },
  taskTitle: { flex: 1, color: '#4a6c8c', fontSize: 15, fontWeight: '500', marginRight: 8 },
  taskTitleCompleted: { color: '#94a3b8', textDecorationLine: 'line-through' },
  optionsButton: { padding: 6 },
  taskRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityCapsule: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCapsuleText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  inlineInput: { flex: 1, color: '#4a6c8c', fontSize: 15, fontWeight: '500', padding: 0 },
  checkButton: { padding: 2 },
  orangeButton: {
    width: '100%', height: 48,
    backgroundColor: '#ff6b2b',
    borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ff6b2b', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  orangeButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCenterContainer: { width: '80%', maxWidth: 280 },
  modalDropdownMenu: {
    backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 10,
    shadowColor: '#4a6c8c', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 10,
    borderWidth: 1, borderColor: '#cbd5e1',
  },
  modalMenuTitle: {
    paddingHorizontal: 16, paddingVertical: 8,
    fontSize: 14, fontWeight: '700', color: '#64748b', textAlign: 'center',
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 10 },
  menuItemText: { color: '#4a6c8c', fontSize: 14, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 4 },
  menuItemDelete: { color: '#ef4444' },
  taskLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dragHandle: {
    marginRight: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
});
