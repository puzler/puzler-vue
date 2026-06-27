<template>
  <section class="bg-paper border border-line rounded-xl p-6 mb-6">
    <h2 class="font-display text-lg font-semibold mb-1">
      Your data
    </h2>
    <p class="text-sm text-soft mb-5">
      Download everything we store about you, or permanently delete your account.
    </p>

    <div class="flex items-center justify-between py-3 border-b border-line">
      <div>
        <p class="text-sm font-medium text-ink-text">
          Download my data
        </p>
        <p class="text-xs text-faint">
          A JSON file with your profile, puzzles, plays, and more.
        </p>
      </div>
      <button
        type="button"
        :disabled="downloading"
        class="px-3 py-1.5 rounded-lg text-sm border border-line bg-surface hover:bg-line/40 transition-colors disabled:opacity-50"
        @click="download"
      >
        {{ downloading ? 'Preparing…' : 'Download' }}
      </button>
    </div>

    <div class="flex items-center justify-between py-3">
      <div>
        <p class="text-sm font-medium text-ink-text">
          Delete account
        </p>
        <p class="text-xs text-faint">
          Permanently erases your account and all your content. This cannot be undone.
        </p>
      </div>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg text-sm bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
        @click="openDelete"
      >
        Delete account
      </button>
    </div>

    <p
      v-if="error"
      class="text-sm text-red-700 mt-2"
    >
      {{ error }}
    </p>

    <DeleteAccountModal
      v-if="confirming"
      :password-set="!!auth.user?.passwordSet"
      :pending="deleting"
      :errors="deleteErrors"
      @cancel="confirming = false"
      @confirm="confirmDelete"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import DeleteAccountModal from './DeleteAccountModal.vue'

const router = useRouter()
const auth = useAuthStore()

const downloading = ref(false)
const error = ref<string | null>(null)

async function download() {
  error.value = null
  downloading.value = true
  try {
    await auth.downloadData()
  } catch {
    error.value = 'Could not prepare your download. Please try again.'
  } finally {
    downloading.value = false
  }
}

const confirming = ref(false)
const deleteErrors = ref<string[]>([])
const deleting = ref(false)

function openDelete() {
  deleteErrors.value = []
  confirming.value = true
}

async function confirmDelete(opts: { currentPassword?: string; confirmation?: string }) {
  deleteErrors.value = []
  deleting.value = true
  try {
    await auth.deleteAccount(opts)
    router.push('/')
  } catch (e) {
    deleteErrors.value =
      e instanceof ApiError && e.errors.length ? e.errors : ['Something went wrong. Please try again.']
  } finally {
    deleting.value = false
  }
}
</script>
