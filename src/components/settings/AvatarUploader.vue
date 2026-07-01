<template>
  <div>
    <div class="flex items-center gap-4 mb-5">
      <UserAvatar
        :avatar-url="previewUrl ?? auth.user?.avatarUrl"
        :display-name="auth.user?.displayName ?? ''"
        :size="64"
      />
      <div class="flex gap-2">
        <label
          class="px-3 py-1.5 rounded-lg text-sm border border-line bg-surface hover:bg-line/40 cursor-pointer transition-colors"
        >
          {{ pending ? 'Uploading…' : 'Upload photo' }}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="hidden"
            :disabled="pending"
            @change="onSelected"
          >
        </label>
        <button
          v-if="auth.user?.avatarUrl && !pendingFile"
          type="button"
          :disabled="pending"
          class="px-3 py-1.5 rounded-lg text-sm text-soft hover:bg-line/60 transition-colors"
          @click="remove"
        >
          Remove
        </button>
      </div>
    </div>

    <!-- Pre-submit notice when the selected image will be optimized -->
    <div
      v-if="pendingFile"
      class="mb-4 p-3 rounded-lg border border-line bg-paper text-sm"
    >
      <p class="text-ink-text">
        <template v-if="willDownscale">
          This image ({{ dims?.width }}×{{ dims?.height }}) will be resized to {{ MAX_AVATAR_DIMENSION }}px
          and optimized before upload.
        </template>
        <template v-else>
          Ready to upload your new avatar.
        </template>
      </p>
      <div class="flex gap-2 mt-3">
        <button
          type="button"
          :disabled="pending"
          class="px-3 py-1.5 rounded-lg text-sm bg-action text-on-action hover:bg-action-deep transition-colors disabled:opacity-50"
          @click="confirmUpload"
        >
          {{ pending ? 'Uploading…' : 'Upload' }}
        </button>
        <button
          type="button"
          :disabled="pending"
          class="px-3 py-1.5 rounded-lg text-sm text-soft hover:bg-line/60 transition-colors"
          @click="cancelPending"
        >
          Cancel
        </button>
      </div>
    </div>

    <p
      v-if="error"
      class="text-sm text-red-700 mb-4"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/utils/api'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  readImageDimensions,
  needsDownscale,
  downscaleImage,
  MAX_AVATAR_DIMENSION,
  type ImageDimensions,
} from '@/utils/image'

const auth = useAuthStore()

const pending = ref(false)
const error = ref<string | null>(null)

const pendingFile = ref<File | null>(null)
const dims = ref<ImageDimensions | null>(null)
const willDownscale = ref(false)
const previewUrl = ref<string | null>(null)

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

async function onSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-selecting the same file later
  if (!file) return

  error.value = null
  try {
    dims.value = await readImageDimensions(file)
    willDownscale.value = needsDownscale(dims.value)
  } catch {
    dims.value = null
    willDownscale.value = false
  }
  clearPreview()
  previewUrl.value = URL.createObjectURL(file)
  pendingFile.value = file
}

async function confirmUpload() {
  const file = pendingFile.value
  if (!file) return
  error.value = null
  pending.value = true
  try {
    // Downscale in-browser when needed (server re-processes regardless);
    // fall back to the original if the browser can't produce a blob.
    const blob = willDownscale.value ? (await downscaleImage(file)) ?? file : file
    const filename = blob === file ? file.name : 'avatar.webp'
    await auth.uploadAvatar(blob, filename)
    cancelPending()
  } catch (e) {
    error.value =
      e instanceof ApiError && e.errors.length ? e.errors.join(', ') : 'Upload failed. Please try again.'
  } finally {
    pending.value = false
  }
}

function cancelPending() {
  pendingFile.value = null
  dims.value = null
  willDownscale.value = false
  clearPreview()
}

async function remove() {
  error.value = null
  pending.value = true
  try {
    await auth.removeAvatar()
  } catch {
    error.value = 'Could not remove the photo. Please try again.'
  } finally {
    pending.value = false
  }
}
</script>
