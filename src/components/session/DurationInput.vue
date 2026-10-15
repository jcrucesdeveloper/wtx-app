<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  clockTextFromDigits,
  digitsFromSeconds,
  formatDurationInput,
  normalizeDurationDigits,
  parseDurationInput,
  secondsFromDigits,
} from '@/lib/durationInput'

/**
 * A duration typed as mm:ss on a phone's numeric keypad. The keypad has no
 * colon, so digits fill in from the right like a kitchen timer and the colon
 * is put in for you: `1` → 0:01, `13` → 0:13, `130` → 1:30. Focusing selects
 * it, so typing replaces the value instead of adding to it. A pasted `1:30`
 * or `1m30s` is read as written.
 *
 * Unstyled: the parent's classes land on the `<input>` itself.
 */
const props = defineProps<{
  /** Seconds; `null` while empty. */
  modelValue: number | null
  /** Shown greyed out while empty, e.g. last time's duration. */
  placeholderSeconds?: number
}>()

const emit = defineEmits<{ 'update:modelValue': [seconds: number | null] }>()

const editing = ref(false)
const digits = ref('')

const text = computed(() => {
  if (editing.value) return clockTextFromDigits(digits.value)
  return props.modelValue != null ? formatDurationInput(props.modelValue) : ''
})

const placeholder = computed(() =>
  props.placeholderSeconds != null ? formatDurationInput(props.placeholderSeconds) : '0:00',
)

function onFocus(event: FocusEvent) {
  digits.value = digitsFromSeconds(props.modelValue)
  editing.value = true
  const input = event.target as HTMLInputElement
  input.value = clockTextFromDigits(digits.value)
  input.select()
}

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  const pasted = (event as InputEvent).inputType === 'insertFromPaste'
  const parsed = pasted ? parseDurationInput(input.value) : null
  digits.value = parsed !== null ? digitsFromSeconds(parsed) : normalizeDurationDigits(input.value)
  // Written back straight away: a stray key that changes nothing must not stay on screen.
  input.value = clockTextFromDigits(digits.value)
  emit('update:modelValue', secondsFromDigits(digits.value))
}

function onBlur() {
  editing.value = false
}
</script>

<template>
  <input
    type="text"
    inputmode="numeric"
    enterkeyhint="done"
    autocomplete="off"
    :value="text"
    :placeholder="placeholder"
    @focus="onFocus"
    @input="onInput"
    @blur="onBlur"
    @keydown.enter="($event.target as HTMLInputElement).blur()"
  />
</template>
