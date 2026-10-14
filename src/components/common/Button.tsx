import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../../theme';
import { spacing, radius, componentSize, fontSize, fontWeight } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.secondary,
        };
      case 'outline':
        return {
          backgroundColor: colors.transparent,
          borderColor: colors.primary,
          borderWidth: 1,
        };
      case 'text':
        return {
          backgroundColor: colors.transparent,
          borderColor: colors.transparent,
        };
      case 'danger':
        return {
          backgroundColor: colors.danger,
          borderColor: colors.danger,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { height: 36, paddingHorizontal: spacing.m };
      case 'medium':
        return { height: componentSize.buttonHeight, paddingHorizontal: spacing.l };
      case 'large':
        return { height: 56, paddingHorizontal: spacing.xl };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return '#FFFFFF';
      case 'outline':
        return colors.primary;
      case 'text':
        return colors.primary;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'small': return fontSize.caption;
      case 'medium': return fontSize.body;
      case 'large': return fontSize.subtitle;
    }
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getVariantStyle(),
        getSizeStyle(),
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? spacing.s : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.s,
  },
  text: {
    fontWeight: fontWeight.medium,
  },
});
