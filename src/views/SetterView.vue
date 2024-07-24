<script setup lang="ts">
import PuzzleSetter from '@/components/player/PuzzleSetter.vue'
import router from '@/plugins/router';

const props = defineProps<{ puzzleId?: string }>()
</script>

<template lang="pug">
PuzzleSetter(:puzzleId="puzzleId")
</template>

<style scoped lang="stylus">
</style>
