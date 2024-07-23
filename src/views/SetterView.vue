<script setup lang="ts">
import PuzzleSetter from '@/components/player/PuzzleSetter.vue'
import router from '@/plugins/router';

const props = defineProps<{ puzzleId?: string }>()

console.log(router.currentRoute.value)
console.log(props)
</script>

<template lang="pug">
PuzzleSetter(:puzzleId="puzzleId")
</template>

<style scoped lang="stylus">
</style>
