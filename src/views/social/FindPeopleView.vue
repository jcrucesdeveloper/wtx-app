<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ArrowLeft, Search } from '@lucide/vue'
import AppPage from '@/components/AppPage.vue'
import PersonRow from '@/components/social/PersonRow.vue'
import { useSocialStore, type Person } from '@/stores/social'
import { scrollAppToTop } from '@/lib/scrollAppToTop'

const MIN_QUERY = 2
const DEBOUNCE_MS = 300

const { t } = useI18n()
const router = useRouter()
const social = useSocialStore()

const query = ref('')
const results = ref<Person[]>([])
const searching = ref(false)
const searchFailed = ref(false)
const suggestionsFailed = ref(false)

onMounted(async () => {
  scrollAppToTop()
  try {
    await Promise.all([social.loadSuggestions(), social.loadFollowing()])
  } catch {
    suggestionsFailed.value = true
  }
})

let timer: ReturnType<typeof setTimeout> | undefined
let latest = 0

watch(query, (value) => {
  clearTimeout(timer)
  const q = value.trim()
  searchFailed.value = false
  if (q.length < MIN_QUERY) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    const ticket = ++latest
    try {
      const found = await social.searchPeople(q)
      if (ticket === latest) results.value = found
    } catch {
      if (ticket === latest) searchFailed.value = true
    } finally {
      if (ticket === latest) searching.value = false
    }
  }, DEBOUNCE_MS)
})

onBeforeUnmount(() => clearTimeout(timer))

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace({ name: 'social' })
}
</script>

<template>
  <AppPage :title="t('social.findPeople')">
    <template #leading>
      <button type="button" class="icon-btn" :aria-label="t('social.back')" @click="goBack">
        <ArrowLeft :size="20" :stroke-width="2.25" />
      </button>
    </template>

    <div class="stack">
      <label class="search">
        <Search :size="18" :stroke-width="2.25" />
        <input
          v-model="query"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          maxlength="24"
          :placeholder="t('social.people.searchPlaceholder')"
          :aria-label="t('social.people.searchPlaceholder')"
        />
      </label>

      <section v-if="query.trim().length >= MIN_QUERY" class="block">
        <h2 class="section-title">{{ t('social.people.results') }}</h2>
        <p v-if="searching && !results.length" class="note">{{ t('social.loading') }}</p>
        <p v-else-if="searchFailed" class="note">{{ t('social.loadError') }}</p>
        <p v-else-if="!results.length" class="note">{{ t('social.people.noResults', { query: query.trim() }) }}</p>
        <ul v-else class="list">
          <li v-for="person in results" :key="person.id">
            <PersonRow
              :id="person.id"
              :name="person.display_name"
              :follows-me="person.follows_me"
              :hint="person.follows_me ? t('social.followsYou') : undefined"
            />
          </li>
        </ul>
      </section>

      <section v-else class="block">
        <h2 class="section-title">{{ t('social.suggestedTitle') }}</h2>
        <p v-if="suggestionsFailed" class="note">{{ t('social.loadError') }}</p>
        <p v-else-if="!social.suggestions.length" class="note">{{ t('social.people.noSuggestions') }}</p>
        <ul v-else class="list">
          <li v-for="person in social.suggestions" :key="person.id">
            <PersonRow
              :id="person.id"
              :name="person.display_name"
              :follows-me="person.follows_me"
              :hint="t(`social.reason.${person.reason}`)"
            />
          </li>
        </ul>
        <p class="tip">{{ t('social.people.tip') }}</p>
      </section>
    </div>
  </AppPage>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-heading);
  cursor: pointer;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.search:focus-within {
  border-color: var(--color-accent);
}

.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--color-heading);
  font: inherit;
  font-size: 16px; /* keeps iOS from zooming in on focus */
  outline: none;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: var(--label-size);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--label-tracking);
  opacity: 0.6;
}

.note {
  padding: 12px 0;
  font-size: 13px;
  opacity: 0.7;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
}

.tip {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.6;
}
</style>
