<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import UserAvatar from '@/components/UserAvatar.vue'
import { SetterTierEnum, SolveHistoryVisibilityEnum, UserRoleEnum } from '@/graphql/generated/types'
import type { PublicUserFieldsFragment } from '@/graphql/generated/types'

const props = defineProps<{ user: PublicUserFieldsFragment; isOwner: boolean }>()

const TIER_LABEL: Record<string, string> = {
  [SetterTierEnum.Rising]: 'Rising setter',
  [SetterTierEnum.Experienced]: 'Experienced setter',
}
const tierBadge = computed(() => TIER_LABEL[props.user.setterTier] ?? null)
const isAdmin = computed(() => props.user.role === UserRoleEnum.Admin)

// The solve count is itself part of the solve-history disclosure: hidden at the
// most private level (unless you are the owner).
const showSolveCount = computed(
  () => props.isOwner || props.user.profileVisibility.solveHistory !== SolveHistoryVisibilityEnum.Hidden,
)

const joinedLabel = computed(() =>
  new Date(props.user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
)
</script>

<template>
  <header class="flex flex-col sm:flex-row sm:items-start gap-5">
    <UserAvatar
      :avatar-url="user.avatarUrl"
      :display-name="user.displayName"
      :size="96"
    />

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="font-display text-2xl font-bold text-ink-text truncate">
          {{ user.displayName }}
        </h1>
        <span
          v-if="isAdmin"
          class="text-[10px] px-1.5 py-0.5 rounded bg-spark-tint text-spark font-medium"
        >Admin</span>
        <span
          v-if="tierBadge"
          class="text-[10px] px-1.5 py-0.5 rounded bg-action-tint text-action"
        >{{ tierBadge }}</span>
      </div>

      <p class="text-soft">
        @{{ user.username }}
      </p>

      <p
        v-if="user.bio"
        class="mt-3 text-sm text-ink-text whitespace-pre-line"
      >
        {{ user.bio }}
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
        <span v-if="user.puzzleCount > 0">{{ user.puzzleCount }} puzzle{{ user.puzzleCount === 1 ? '' : 's' }}</span>
        <span v-if="showSolveCount">{{ user.solveCount }} solved</span>
        <span>Joined {{ joinedLabel }}</span>
      </div>
    </div>

    <RouterLink
      v-if="isOwner"
      to="/settings"
      class="self-start px-3 py-1.5 rounded-lg text-sm border border-line text-soft hover:text-action hover:border-action transition-colors"
    >
      Edit profile
    </RouterLink>
  </header>
</template>
