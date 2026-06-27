<template>
  <ContentPage>
    <div class="bg-canvas min-h-full py-10 px-4">
      <div class="max-w-2xl mx-auto">
        <h1 class="font-display text-2xl font-bold mb-6">
          Account settings
        </h1>

        <ProfileSection data-tour="settings-profile" />
        <PrivacySection data-tour="settings-privacy" />
        <PuzzleDefaultsSection data-tour="settings-puzzle-defaults" />
        <AppearanceSection data-tour="settings-appearance" />
        <PasswordSection data-tour="settings-password" />
        <ConnectionsSection data-tour="settings-connections" />
        <DataSection data-tour="settings-data" />
        <ToursSection />
      </div>
    </div>
  </ContentPage>
</template>

<script setup lang="ts">
import ContentPage from '@/components/ContentPage.vue'
import ProfileSection from '@/components/settings/ProfileSection.vue'
import PrivacySection from '@/components/settings/PrivacySection.vue'
import PuzzleDefaultsSection from '@/components/settings/PuzzleDefaultsSection.vue'
import AppearanceSection from '@/components/settings/AppearanceSection.vue'
import PasswordSection from '@/components/settings/PasswordSection.vue'
import ConnectionsSection from '@/components/settings/ConnectionsSection.vue'
import DataSection from '@/components/settings/DataSection.vue'
import ToursSection from '@/components/settings/ToursSection.vue'
import { usePageTour } from '@/composables/usePageTour'

usePageTour()
</script>
