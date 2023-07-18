<script setup lang="ts">
import { RouterView } from 'vue-router'
import useStylingStore from '@/stores/styling'

const stylingStore = useStylingStore()
</script>

<template lang="pug">
RouterView
</template>
