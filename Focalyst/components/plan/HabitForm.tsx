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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../src/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '../../src/utils/UserContext';
import { useNotifications } from '../../src/hooks/useNotifications';

interface HabitFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingHabit: any | null;
  userId: string;
  isDarkMode?: boolean;
  onRefresh: () => void;
}

const EMOJIS = ['💧', '🚶', '🧘', '📚', '💪', '🎯', '😴'];
const COLORS = [
  '#8b5cf6', // Purple
  '#3B82F6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow/Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

const DURATION_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
  { label: '90m', minutes: 90 },
  { label: '2h', minutes: 120 },
];

export default function HabitForm({
  isOpen,
  onClose,
  editingHabit,
  userId,
  isDarkMode = true,
  onRefresh,
}: HabitFormProps) {
  const insets = useSafeAreaInsets();
  const isEditing = !!editingHabit;
  const router = useRouter();
  const { profile } = useUser();
  const { scheduleHabitNotifications, cancelHabitNotifications } = useNotifications();

  const [habitName, setHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎯');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [showCustomColorModal, setShowCustomColorModal] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Repeat days: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [allDaysChecked, setAllDaysChecked] = useState(false);
  
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0); // 07:00 PM default
    return d;
  });
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
    white: '#FFFFFF',
    darkNavy: '#0B1021',
  };

  // Helper time formatters
  const formatTimeDisplay = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours < 10 ? '0' : ''}${hours}:${minutesStr} ${ampm}`;
  };

  const formatTimeDisplayShort = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minutesStr} ${ampm}`;
  };

  const getCheckInDate = (startDate: Date, durationMins: number): Date => {
    return new Date(startDate.getTime() + durationMins * 60 * 1000);
  };

  // Initialize form state if editing
  useEffect(() => {
    if (isOpen) {
      if (editingHabit) {
        setHabitName(editingHabit.name || '');
        setSelectedIcon(editingHabit.icon || '🎯');
        setSelectedColor(editingHabit.color || '#3B82F6');
        
        setStartDate(editingHabit.start_date || '');
        setEndDate(editingHabit.end_date || '');
        
        const isCustom = editingHabit.frequency === 'custom';
        const customDays = editingHabit.custom_days || [];
        
        if (!isCustom) {
          setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
          setAllDaysChecked(true);
        } else {
          setSelectedDays(customDays);
          setAllDaysChecked(customDays.length === 7);
        }
        
        if (editingHabit.reminder_time) {
          setRemindersEnabled(true);
          const parts = editingHabit.reminder_time.split(':');
          if (parts.length >= 2) {
            const d = new Date();
            d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
            setReminderDate(d);
          }
        } else {
          setRemindersEnabled(false);
          const d = new Date();
          d.setHours(19, 0, 0, 0);
          setReminderDate(d);
        }

        if (editingHabit.duration_minutes) {
          setDurationMinutes(Number(editingHabit.duration_minutes) || 30);
        } else {
          setDurationMinutes(30);
        }
      } else {
        setHabitName('');
        setSelectedIcon('🎯');
        setSelectedColor('#3B82F6');
        setStartDate('');
        setEndDate('');
        setSelectedDays([]);
        setAllDaysChecked(false);
        setRemindersEnabled(false);
        const d = new Date();
        d.setHours(19, 0, 0, 0);
        setReminderDate(d);
        setDurationMinutes(30);
      }
      setShowTimePicker(false);
    }
  }, [isOpen, editingHabit]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) => {
      let updated;
      if (prev.includes(dayIndex)) {
        updated = prev.filter((d) => d !== dayIndex);
      } else {
        updated = [...prev, dayIndex];
      }
      setAllDaysChecked(updated.length === 7);
      return updated;
    });
  };

  const handleAllDaysToggle = () => {
    if (allDaysChecked) {
      setSelectedDays([]);
      setAllDaysChecked(false);
    } else {
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
      setAllDaysChecked(true);
    }
  };

  const handleCustomPalettePress = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Custom Color',
        'Enter a hex color code (e.g. #3B82F6 or #8b5cf6):',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: (val?: string) => {
              if (val && val.trim()) {
                let hex = val.trim();
                if (!hex.startsWith('#')) hex = '#' + hex;
                setSelectedColor(hex);
              }
            },
          },
        ],
        'plain-text',
        selectedColor
      );
    } else {
      setCustomHexInput(selectedColor);
      setShowCustomColorModal(true);
    }
  };

  const handleSubmit = async () => {
    if (!habitName.trim()) {
      Alert.alert('Validation Error', 'Please name your habit.');
      return;
    }

    setSubmitting(true);
    try {
      const isDaily = allDaysChecked || selectedDays.length === 7;
      
      // Format reminder_time as 'HH:MM:00' (24-hour time string)
      const hoursStr = String(reminderDate.getHours()).padStart(2, '0');
      const minutesStr = String(reminderDate.getMinutes()).padStart(2, '0');
      const formattedReminderTime = remindersEnabled ? `${hoursStr}:${minutesStr}:00` : null;

      // Core payload guaranteed to match basic Postgres habits schema
      const corePayload: any = {
        user_id: userId,
        name: habitName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        frequency: isDaily ? 'daily' : 'custom',
        custom_days: isDaily ? null : [...selectedDays].sort((a, b) => a - b),
        reminder_time: formattedReminderTime,
      };

      // Extended payload with optional columns (start_date, end_date, duration_minutes)
      const extendedPayload: any = {
        ...corePayload,
      };
      if (startDate.trim()) extendedPayload.start_date = startDate.trim();
      if (endDate.trim()) extendedPayload.end_date = endDate.trim();
      if (remindersEnabled && durationMinutes) extendedPayload.duration_minutes = durationMinutes;

      // Free plan habit limit check
      if (!editingHabit && profile && !profile.isPro) {
        const { count, error: countError } = await supabase
          .from('habits')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true);

        if (count !== null && count >= 2) {
          setSubmitting(false);
          onClose();
          router.push('/paywall');
          return;
        }
      }

      const executeSave = async (payloadToUse: any) => {
        if (editingHabit) {
          return await supabase
            .from('habits')
            .update(payloadToUse)
            .eq('id', editingHabit.id)
            .select()
            .single();
        } else {
          const insertPayload = {
            ...payloadToUse,
            current_streak: 0,
            longest_streak: 0,
            is_active: true,
          };
          return await supabase
            .from('habits')
            .insert([insertPayload])
            .select()
            .single();
        }
      };

      // Try primary insert/update with extendedPayload
      let saveResult = await executeSave(extendedPayload);

      // Resilient Fallback: If Supabase returns schema cache or missing column error
      if (saveResult.error) {
        const errMsg = saveResult.error.message || '';
        const errCode = (saveResult.error as any).code || '';
        const isColumnOrSchemaError =
          errCode === 'PGRST204' ||
          errMsg.toLowerCase().includes('column') ||
          errMsg.toLowerCase().includes('schema cache');

        if (isColumnOrSchemaError) {
          console.warn('[HabitForm] Extended columns missing in schema cache, retrying with core payload:', errMsg);
          saveResult = await executeSave(corePayload);
        }
      }

      if (saveResult.error) throw saveResult.error;

      const savedHabitId = saveResult.data?.id || editingHabit?.id;

      // Schedule or cancel notifications
      if (remindersEnabled && savedHabitId) {
        await scheduleHabitNotifications({
          habitId: savedHabitId,
          habitName: habitName.trim(),
          icon: selectedIcon,
          hour: reminderDate.getHours(),
          minute: reminderDate.getMinutes(),
          durationMinutes,
          repeatDays: isDaily || selectedDays.length === 0 ? [1, 2, 3, 4, 5, 6, 0] : selectedDays,
        });
      } else if (!remindersEnabled && savedHabitId) {
        await cancelHabitNotifications(savedHabitId);
      }

      onRefresh();
      onClose();
    } catch (e: any) {
      console.error('[HabitForm] Error saving habit:', e);
      Alert.alert('Database Error', e.message || 'Failed to save habit');
    } finally {
      setSubmitting(false);
    }
  };

  const weekdaysList = [
    { label: 'M', index: 1 },
    { label: 'T', index: 2 },
    { label: 'W', index: 3 },
    { label: 'T', index: 4 },
    { label: 'F', index: 5 },
    { label: 'S', index: 6 },
    { label: 'S', index: 0 },
  ];

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
              {isEditing ? 'Edit habit' : 'New habit'}
            </Text>
          </View>

          <TouchableOpacity onPress={handleSave} style={{ padding: 4 }} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Ionicons name="checkmark" size={28} color="#FF6B00" />
          </TouchableOpacity>
        </View>

        <View style={styles.formWrapper}>
          {/* Form Fields Container */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
          >
            {/* Field: Name your habit */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name your habit</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.cardBg, color: theme.textPrimary }]}
                placeholder="e.g. Meditation"
                placeholderTextColor={theme.textSecondary}
                value={habitName}
                onChangeText={setHabitName}
              />
            </View>

            {/* Field: Choose Icon */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Choose Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                <View style={styles.iconList}>
                  {EMOJIS.map((emoji) => {
                    const isActive = selectedIcon === emoji;
                    return (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.iconItem,
                          { backgroundColor: theme.cardBg },
                          isActive && { borderColor: theme.accentBlue, borderWidth: 2, backgroundColor: isDarkMode ? '#151B2E' : '#ffffff' },
                        ]}
                        onPress={() => setSelectedIcon(emoji)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Field: Color Swatches */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Color</Text>
              <View style={styles.colorList}>
                {COLORS.map((color) => {
                  const isActive = selectedColor.toLowerCase() === color.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorItem,
                        { backgroundColor: color },
                        isActive && { borderColor: theme.accentBlue, borderWidth: 3 },
                      ]}
                      onPress={() => setSelectedColor(color)}
                      activeOpacity={0.8}
                    >
                      {isActive && (
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Display custom color swatch if not in preset palette */}
                {!COLORS.map(c => c.toLowerCase()).includes(selectedColor.toLowerCase()) && (
                  <TouchableOpacity
                    style={[
                      styles.colorItem,
                      { backgroundColor: selectedColor, borderColor: theme.accentBlue, borderWidth: 3 },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                  </TouchableOpacity>
                )}

                {/* Custom Palette Button */}
                <TouchableOpacity 
                  style={[styles.customPaletteButton, { backgroundColor: theme.cardBg }]} 
                  onPress={handleCustomPalettePress}
                  activeOpacity={0.8}
                >
                  <Ionicons name="color-palette-outline" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Set a goal */}
            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Set a goal</Text>
              <View style={styles.datesGrid}>
                {/* Start Date */}
                <View style={[styles.dateInputWrapper, { backgroundColor: theme.cardBg }]}>
                  <TextInput
                    style={[styles.dateInput, { color: theme.textPrimary }]}
                    placeholder="dd/mm/yyyy"
                    placeholderTextColor={theme.textSecondary}
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} style={styles.dateIcon} />
                </View>

                {/* End Date */}
                <View style={[styles.dateInputWrapper, { backgroundColor: theme.cardBg }]}>
                  <TextInput
                    style={[styles.dateInput, { color: theme.textPrimary }]}
                    placeholder="dd/mm/yyyy"
                    placeholderTextColor={theme.textSecondary}
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} style={styles.dateIcon} />
                </View>
              </View>
            </View>

            {/* Field: Repeat days */}
            <View style={styles.formField}>
              <View style={styles.repeatDaysHeader}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Repeat days</Text>
                
                {/* All days checkbox toggle */}
                <TouchableOpacity 
                  style={styles.allDaysToggle} 
                  onPress={handleAllDaysToggle}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.allDaysLabel, { color: theme.textSecondary }]}>All days</Text>
                  <View style={[
                    styles.checkbox,
                    { backgroundColor: isDarkMode ? '#151B2E' : '#ffffff', borderColor: theme.borderColor },
                    allDaysChecked && { backgroundColor: theme.accentBlue, borderColor: theme.accentBlue }
                  ]}>
                    {allDaysChecked && (
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.weekdaysGrid}>
                {weekdaysList.map((day) => {
                  const isActive = selectedDays.includes(day.index);
                  return (
                    <TouchableOpacity
                      key={day.index}
                      style={[
                        styles.weekdayItem,
                        isActive 
                          ? { backgroundColor: theme.accentBlue } 
                          : { backgroundColor: theme.cardBg },
                      ]}
                      onPress={() => toggleDay(day.index)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.weekdayText,
                        { color: isActive ? '#ffffff' : theme.textSecondary }
                      ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Field: Get Reminders */}
            <TouchableOpacity
              style={styles.remindersField}
              activeOpacity={0.8}
              onPress={() => setRemindersEnabled((prev) => !prev)}
            >
              <Text style={[styles.remindersLabel, { color: theme.textPrimary }]}>Get reminders</Text>
              <Switch
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
                trackColor={{ false: isDarkMode ? '#222A41' : '#cbd5e1', true: theme.accentOrange }}
                thumbColor="#ffffff"
                ios_backgroundColor={isDarkMode ? '#222A41' : '#cbd5e1'}
              />
            </TouchableOpacity>

            {/* Expanded Reminder & Duration Configuration Section */}
            {remindersEnabled && (
              <View style={styles.remindersSection}>
                {/* A. REMINDER TIME Picker */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>REMINDER TIME</Text>
                  <TouchableOpacity
                    style={[styles.dateInputWrapper, { backgroundColor: theme.cardBg }]}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timeDisplayText, { color: theme.textPrimary }]}>
                      {formatTimeDisplay(reminderDate)}
                    </Text>
                    <Ionicons name="time-outline" size={18} color={theme.textSecondary} style={styles.dateIcon} />
                  </TouchableOpacity>
                </View>

                {/* B. HABIT DURATION Selector */}
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DURATION (FOLLOW-UP CHECK-IN)</Text>
                  <View style={styles.durationPillsRow}>
                    {DURATION_OPTIONS.map((opt) => {
                      const isSelected = durationMinutes === opt.minutes;
                      return (
                        <TouchableOpacity
                          key={opt.minutes}
                          style={[
                            styles.durationPill,
                            { 
                              backgroundColor: isSelected ? theme.accentOrange : theme.cardBg,
                              borderColor: isSelected ? theme.accentOrange : theme.borderColor,
                            },
                          ]}
                          onPress={() => setDurationMinutes(opt.minutes)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.durationPillText,
                              { color: isSelected ? '#ffffff' : theme.textSecondary, fontWeight: isSelected ? '700' : '600' },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={[styles.helperCaption, { color: theme.textSecondary }]}>
                    You'll get a reminder at {formatTimeDisplayShort(reminderDate)} and a check-in at {formatTimeDisplayShort(getCheckInDate(reminderDate, durationMinutes))} asking if you finished.
                  </Text>
                </View>
              </View>
            )}

            {/* Time Picker Modal for iOS */}
            {Platform.OS === 'ios' && showTimePicker && (
              <Modal
                transparent={true}
                animationType="fade"
                visible={showTimePicker}
                onRequestClose={() => setShowTimePicker(false)}
              >
                <TouchableOpacity
                  style={styles.timePickerOverlay}
                  activeOpacity={1}
                  onPress={() => setShowTimePicker(false)}
                >
                  <View
                    style={[styles.timePickerModalContainer, { backgroundColor: theme.cardBg }]}
                    onStartShouldSetResponder={() => true}
                  >
                    <View style={styles.timePickerHeader}>
                      <Text style={[styles.timePickerTitle, { color: theme.textPrimary }]}>
                        Select Reminder Time
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowTimePicker(false)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={[styles.timePickerDoneText, { color: theme.accentOrange }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={reminderDate}
                      mode="time"
                      display="spinner"
                      themeVariant={isDarkMode ? 'dark' : 'light'}
                      textColor={theme.textPrimary}
                      onChange={(event, date) => {
                        if (date) setReminderDate(date);
                      }}
                      style={{ height: 200, width: '100%' }}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            )}

            {/* Time Picker for Android */}
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker
                value={reminderDate}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (date) setReminderDate(date);
                }}
              />
            )}

            {/* Custom Color Modal for Android/Web */}
            {showCustomColorModal && (
              <Modal
                visible={showCustomColorModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCustomColorModal(false)}
              >
                <TouchableOpacity
                  style={styles.timePickerOverlay}
                  activeOpacity={1}
                  onPress={() => setShowCustomColorModal(false)}
                >
                  <View
                    style={[styles.customColorModalContainer, { backgroundColor: theme.cardBg, borderColor: theme.borderColor }]}
                    onStartShouldSetResponder={() => true}
                  >
                    <Text style={[styles.customColorTitle, { color: theme.textPrimary }]}>Custom Hex Color</Text>
                    <TextInput
                      style={[styles.customColorInput, { backgroundColor: theme.bg, color: theme.textPrimary, borderColor: theme.borderColor }]}
                      value={customHexInput}
                      onChangeText={setCustomHexInput}
                      placeholder="#3B82F6"
                      placeholderTextColor={theme.textSecondary}
                      autoCapitalize="characters"
                      maxLength={7}
                    />
                    <View style={styles.customColorButtonsRow}>
                      <TouchableOpacity
                        style={[styles.customColorCancelBtn, { borderColor: theme.borderColor }]}
                        onPress={() => setShowCustomColorModal(false)}
                      >
                        <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.customColorApplyBtn, { backgroundColor: theme.accentBlue }]}
                        onPress={() => {
                          let hex = customHexInput.trim();
                          if (hex) {
                            if (!hex.startsWith('#')) hex = '#' + hex;
                            setSelectedColor(hex);
                          }
                          setShowCustomColorModal(false);
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700' }}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </Modal>
            )}

            {/* Save Button */}
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
                  {editingHabit ? 'Save changes' : 'Save habit'}
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
    paddingVertical: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  backButton: {
    padding: 4,
    marginLeft: -8,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 4,
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
  iconScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  iconList: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  iconItem: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  colorList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customPaletteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  dateInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  dateIcon: {
    marginLeft: 8,
  },
  repeatDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  allDaysToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allDaysLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdaysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  weekdayItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 13,
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
  remindersSection: {
    gap: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  timeDisplayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  durationPillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  durationPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationPillText: {
    fontSize: 14,
  },
  helperCaption: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 8,
    fontWeight: '500',
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  timePickerModalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  timePickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
  },
  customColorModalContainer: {
    width: '84%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  customColorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  customColorInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  customColorButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  customColorCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customColorApplyBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
