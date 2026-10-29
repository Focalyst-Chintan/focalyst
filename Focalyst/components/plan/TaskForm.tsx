import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Crypto from 'expo-crypto';
import { queryCache } from '../../src/utils/queryCache';
import { useNotifications } from '../../src/hooks/useNotifications';

export type Priority = 'high' | 'medium' | 'low';

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export function normalizePriority(value: unknown): Priority {
  if (value === 'high' || value === 1 || value === '1') return 'high';
  if (value === 'low' || value === 3 || value === '3') return 'low';
  return 'medium';
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask: any | null;
  userId: string;
  isDarkMode?: boolean;
  onRefresh: (forceRefresh?: boolean) => void | Promise<void>;
}

export default function TaskForm({
  isOpen,
  onClose,
  editingTask,
  userId,
  isDarkMode = true,
  onRefresh,
}: TaskFormProps) {
  const insets = useSafeAreaInsets();
  const { scheduleTaskStartAndEndReminders } = useNotifications();
  const isEditing = !!editingTask;
  const [taskDescription, setTaskDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Time picker states
  const [startTime, setStartTime] = useState<Date>(getDefaultTime(9, 0));
  const [endTime, setEndTime] = useState<Date>(getDefaultTime(10, 0));
  const [showStartPicker, setShowStartPicker] = useState(Platform.OS === 'ios');
  const [showEndPicker, setShowEndPicker] = useState(Platform.OS === 'ios');

  // Priority level: 'high' | 'medium' | 'low'
  const [priority, setPriority] = useState<Priority>('medium');
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Theme Object
  const theme = {
    bg: isDarkMode ? '#0B1021' : '#f4f6f9',
    cardBg: isDarkMode ? '#151B2E' : '#e2e8f0',
    textPrimary: isDarkMode ? '#FFFFFF' : '#4a6c8c',
    textSecondary: isDarkMode ? '#8E95A9' : '#94a3b8',
    borderColor: isDarkMode ? '#222A41' : '#cbd5e1',
    accentBlue: '#2B6BFF',
    accentOrange: '#FF6B00',
  };

  function getDefaultTime(hours: number, minutes: number): Date {
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  function timeToString(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}:00`;
  }

  function parseTimeString(timeStr: string): Date {
    const d = new Date();
    const parts = timeStr.split(':');
    d.setHours(parseInt(parts[0], 10) || 9, parseInt(parts[1], 10) || 0, 0, 0);
    return d;
  }

  function formatTimeDisplay(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  // Initialize form state if editing
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTaskDescription(editingTask.title || '');

        const tags = editingTask.tags || [];
        setTagsInput(tags.join(', '));

        if (editingTask.start_time) {
          setStartTime(parseTimeString(editingTask.start_time));
        } else {
          setStartTime(getDefaultTime(9, 0));
        }
        if (editingTask.end_time) {
          setEndTime(parseTimeString(editingTask.end_time));
        } else {
          setEndTime(getDefaultTime(10, 0));
        }

        if (editingTask.priority) {
          setPriority(normalizePriority(editingTask.priority));
        } else {
          setPriority('medium');
        }

        setRemindersEnabled(!!editingTask.reminder_time);
      } else {
        setTaskDescription('');
        setTagsInput('');
        setStartTime(getDefaultTime(9, 0));
        setEndTime(getDefaultTime(10, 0));
        setPriority('medium');
        setRemindersEnabled(false);
      }
    }
  }, [isOpen, editingTask]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!taskDescription.trim()) {
      Alert.alert('Validation Error', 'Please describe what you need to do.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const dbPriority = normalizePriority(priority);

      let reminderTimeISO: string | null = null;
      let targetStartDate: Date | null = null;
      let targetEndDate: Date | null = null;

      if (remindersEnabled) {
        targetStartDate = new Date();
        targetStartDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
        if (targetStartDate.getTime() <= Date.now()) {
          targetStartDate.setDate(targetStartDate.getDate() + 1);
        }
        reminderTimeISO = targetStartDate.toISOString();

        targetEndDate = new Date(targetStartDate);
        targetEndDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
        if (targetEndDate.getTime() <= targetStartDate.getTime()) {
          targetEndDate.setDate(targetEndDate.getDate() + 1);
        }
      }

      const payload: any = {
        user_id: userId,
        title: taskDescription.trim(),
        priority: dbPriority,
        tags: parsedTags,
        start_time: timeToString(startTime),
        end_time: timeToString(endTime),
        reminder_time: reminderTimeISO,
      };

      if (editingTask) {
        payload.id = editingTask.id;
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const taskId = Crypto.randomUUID();
        payload.id = taskId;
        payload.is_completed = false;
        payload.position = 0;
        const { error } = await supabase
          .from('tasks')
          .upsert([payload], { onConflict: 'id' });

        if (error) throw error;
      }

      if (remindersEnabled && targetStartDate && targetEndDate) {
        try {
          await scheduleTaskStartAndEndReminders(
            taskDescription.trim(),
            targetStartDate,
            targetEndDate
          );
        } catch (notifErr) {
          console.warn('Failed to schedule notification:', notifErr);
        }
      }

      // Invalidate Task & Insights caches immediately so UI updates instantly
      queryCache.invalidatePrefix(`user:${userId}:tasks`);
      queryCache.invalidatePrefix(`user:${userId}:insights`);
      queryCache.invalidatePrefix('user:');

      await Promise.resolve(onRefresh(true));
      onClose();
    } catch (e: any) {
      Alert.alert('Database Error', e.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = handleSubmit;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: Math.max(insets.top, 20) + 8,
          paddingBottom: 16,
          paddingHorizontal: 16,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <Ionicons name="chevron-back" size={26} color={theme.textPrimary || '#FFFFFF'} />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: '700', color: theme.textPrimary || '#FFFFFF' }}>
              {isEditing ? 'Edit task' : 'New task'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={submitting}
            style={{ padding: 4, opacity: submitting ? 0.4 : 1 }}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="checkmark" size={28} color="#FF6B00" />
          </TouchableOpacity>
        </View>

        <View style={styles.formWrapper}>
          {/* Scrollable Form Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Describe Field */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Describe</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.cardBg, color: theme.textPrimary }]}
                placeholder="What do you need to do?"
                placeholderTextColor={theme.textSecondary}
                value={taskDescription}
                onChangeText={setTaskDescription}
              />
            </View>

            {/* Set Time Field */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Set time</Text>
              <View style={styles.datesGrid}>
                {/* Start Time */}
                <View style={[styles.dateInputWrapper, { backgroundColor: theme.cardBg }]}>
                  {Platform.OS === 'android' ? (
                    <TouchableOpacity
                      style={styles.androidTimeBtn}
                      onPress={() => setShowStartPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.androidTimeText, { color: theme.textPrimary }]}>{formatTimeDisplay(startTime)}</Text>
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                  {showStartPicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      textColor={isDarkMode ? '#FFFFFF' : '#000000'}
                      themeVariant={isDarkMode ? 'dark' : 'light'}
                      accentColor="#FF6B00"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      onChange={(event, date) => {
                        if (Platform.OS === 'android') setShowStartPicker(false);
                        if (date) setStartTime(date);
                      }}
                      style={Platform.OS === 'ios' ? styles.iosTimePicker : undefined}
                    />
                  )}
                </View>

                {/* End Time */}
                <View style={[styles.dateInputWrapper, { backgroundColor: theme.cardBg }]}>
                  {Platform.OS === 'android' ? (
                    <TouchableOpacity
                      style={styles.androidTimeBtn}
                      onPress={() => setShowEndPicker(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.androidTimeText, { color: theme.textPrimary }]}>{formatTimeDisplay(endTime)}</Text>
                      <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                  {showEndPicker && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      textColor={isDarkMode ? '#FFFFFF' : '#000000'}
                      themeVariant={isDarkMode ? 'dark' : 'light'}
                      accentColor="#FF6B00"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      onChange={(event, date) => {
                        if (Platform.OS === 'android') setShowEndPicker(false);
                        if (date) setEndTime(date);
                      }}
                      style={Platform.OS === 'ios' ? styles.iosTimePicker : undefined}
                    />
                  )}
                </View>
              </View>
            </View>

            {/* Add Tags Field */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Add Tags</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.cardBg, color: theme.textPrimary }]}
                placeholder="e.g. study, urgent"
                placeholderTextColor={theme.textSecondary}
                value={tagsInput}
                onChangeText={setTagsInput}
              />
            </View>

            {/* Priority Level Field */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Priority level</Text>
              <View style={styles.priorityGrid}>
                {PRIORITY_OPTIONS.map(({ value, label }) => {
                  const isActive = priority === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.priorityItem,
                        isActive 
                          ? { backgroundColor: theme.accentBlue } 
                          : { backgroundColor: theme.cardBg },
                      ]}
                      onPress={() => setPriority(value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          { color: isActive ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Reminders Switch Field */}
            <View style={styles.formField}>
              <View style={styles.remindersField}>
                <Text style={[styles.remindersLabel, { color: theme.textPrimary }]}>Get reminders</Text>
                <Switch
                  value={remindersEnabled}
                  onValueChange={setRemindersEnabled}
                  trackColor={{ false: isDarkMode ? '#222A41' : '#cbd5e1', true: theme.accentOrange }}
                  thumbColor="#ffffff"
                  ios_backgroundColor={isDarkMode ? '#222A41' : '#cbd5e1'}
                />
              </View>
              {remindersEnabled && (
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4, lineHeight: 18 }}>
                  You'll get a notification at {formatTimeDisplay(startTime)} when it starts and at {formatTimeDisplay(endTime)} asking if you finished.
                </Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accentOrange, shadowColor: theme.accentOrange }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.9}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingTask ? 'Save changes' : 'Save task'}
                </Text>
              )}
            </TouchableOpacity>

          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  formWrapper: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginLeft: 8,
  },
  headerTickButton: {
    padding: 6,
    marginRight: -4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 24,
  },
  formField: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  dateInputWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 8,
  },
  androidTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    height: 52,
  },
  androidTimeText: {
    fontSize: 15,
    fontWeight: '500',
  },
  iosTimePicker: {
    height: 44,
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityItem: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 999,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 15,
    fontWeight: '700',
  },
  remindersField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  remindersLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
