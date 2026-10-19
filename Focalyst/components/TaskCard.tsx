import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TaskCardProps {
  item: {
    id: string;
    title: string;
    is_completed: boolean;
    priority?: string;
  };
  drag: () => void;
  isActive: boolean;
  isDarkMode?: boolean;
  onToggle: (id: string, currentStatus: boolean) => void;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
}

function getPriorityBadgeStyle(priority: string | undefined, isDark: boolean) {
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

export default function TaskCard({
  item,
  drag,
  isActive,
  isDarkMode = true,
  onToggle,
  onEdit,
  onDelete,
}: TaskCardProps) {
  
  const handleOptionsMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
          title: item.title,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onEdit(item);
          } else if (buttonIndex === 2) {
            onDelete(item.id);
          }
        }
      );
    } else {
      Alert.alert(
        item.title,
        'Choose an action',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit', onPress: () => onEdit(item) },
          { text: 'Delete', onPress: () => onDelete(item.id), style: 'destructive' },
        ]
      );
    }
  };

  const cardBg = isDarkMode ? '#151B2E' : '#FFFFFF';
  const textPrimary = isDarkMode ? '#FFFFFF' : '#1E2229';
  const textSecondary = isDarkMode ? '#8E95A9' : '#5C6479';
  const borderColor = isDarkMode ? '#222A41' : '#E2E8F0';
  const dragColor = isDarkMode ? '#8E95A9' : '#94a3b8';

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: cardBg, borderColor: borderColor, borderWidth: isDarkMode ? 1 : 1 },
        isActive && (isDarkMode ? styles.cardActiveDark : styles.cardActiveLight),
      ]}
    >
      {/* Left: Drag handle + Checkbox + Title */}
      <View style={styles.leftGroup}>
        {/* Drag Handle */}
        <Pressable onPressIn={drag} style={styles.dragHandle}>
          <Ionicons color={dragColor} name="reorder-three" size={24} />
        </Pressable>

        {/* Checkbox */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            { backgroundColor: isDarkMode ? '#0B1021' : '#ffffff', borderColor: isDarkMode ? '#222A41' : '#94a3b8' },
            item.is_completed && styles.checkboxChecked,
          ]}
          onPress={() => onToggle(item.id, item.is_completed)}
          activeOpacity={0.7}
        >
          {item.is_completed && (
            <Ionicons name="checkmark" size={14} color="#ffffff" />
          )}
        </TouchableOpacity>

        {/* Text */}
        <Text
          style={[
            styles.taskText,
            { color: textPrimary },
            item.is_completed && { color: textSecondary, textDecorationLine: 'line-through' },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
      </View>

      {/* Right: Priority Capsule + Three-Dot Button */}
      <View style={styles.rightGroup}>
        {(() => {
          const badge = getPriorityBadgeStyle(item.priority, isDarkMode);
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
          style={styles.optionsButton}
          onPress={handleOptionsMenu}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
  },
  cardActiveLight: {
    backgroundColor: '#E2E8F0',
    shadowColor: '#4a6c8c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    transform: [{ scale: 1.02 }],
  },
  cardActiveDark: {
    backgroundColor: '#1C2438',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    transform: [{ scale: 1.02 }],
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dragHandle: {
    marginRight: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  optionsButton: {
    padding: 6,
  },
  rightGroup: {
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
});
