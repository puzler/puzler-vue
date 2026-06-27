<template>
  <ContentPage>
    <div class="bg-canvas min-h-full py-10 px-4">
      <div class="max-w-2xl mx-auto">
        <h1 class="font-display text-2xl font-bold mb-6">
          Account settings
        </h1>

        <ProfileSection />
        <PrivacySection />
        <AppearanceSection />
        <PasswordSection />
        <ConnectionsSection />
        <DataSection />
      </div>
    </div>
  </ContentPage>
</template>

<script setup lang="ts">
import ContentPage from '@/components/ContentPage.vue'
import ProfileSection from '@/components/settings/ProfileSection.vue'
import PrivacySection from '@/components/settings/PrivacySection.vue'
import AppearanceSection from '@/components/settings/AppearanceSection.vue'
import PasswordSection from '@/components/settings/PasswordSection.vue'
import ConnectionsSection from '@/components/settings/ConnectionsSection.vue'
import DataSection from '@/components/settings/DataSection.vue'
</script>
