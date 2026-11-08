<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Eye, EyeOff } from '@lucide/vue'

/**
 * A password field with an eye button to show or hide what's typed.
 * Other attributes (autocomplete, placeholder…) go to the input itself.
 */
defineOptions({ inheritAttrs: false })

const password = defineModel<string>({ required: true })

const { t } = useI18n()
const visible = ref(false)
</script>

<template>
  <span class="password-input">
    <input
      v-bind="$attrs"
      class="password-input__field"
      v-model="password"
      :type="visible ? 'text' : 'password'"
      autocapitalize="off"
      spellcheck="false"
    />
    <!-- pointerdown.prevent keeps focus (and the keyboard) on the input. -->
    <button
      type="button"
      class="password-input__toggle"
      :aria-label="visible ? t('auth.hidePassword') : t('auth.showPassword')"
      :aria-pressed="visible"
      @pointerdown.prevent
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" :size="20" :stroke-width="2" aria-hidden="true" />
      <Eye v-else :size="20" :stroke-width="2" aria-hidden="true" />
    </button>
  </span>
</template>

<style scoped>
.password-input {
  position: relative;
  display: block;
}

/* Beats the parent form's input padding, so text never runs under the eye. */
.password-input .password-input__field {
  padding-right: 48px;
}

.password-input__toggle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-heading);
  opacity: 0.6;
  cursor: pointer;
}

.password-input__toggle:hover,
.password-input__toggle:focus-visible {
  opacity: 1;
}
</style>
