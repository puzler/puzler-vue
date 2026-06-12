<script setup lang="ts">
import LegalDocument from './LegalDocument.vue'
import { terms } from './terms'
</script>

<template>
  <LegalDocument :doc="terms" />
</template>
