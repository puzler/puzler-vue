<script setup lang="ts">
import { RouterLink } from 'vue-router'
import useAuthStore from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template lang="pug">
header
  RouterLink(to="/")
    img.logo(
      alt="Puzler Logo"
      src="@/assets/puzler.png"
    )
  nav
    RouterLink(
      to="/setter"
    ) Setter
    .spacer
    RouterLink(
      v-if="!authStore.authenticated"
      to="/auth/sign-in"
    ) Sign In
    a(
      v-else
      href="#"
      v-on:click.stop="authStore.signOut"
    ) Sign Out
    RouterLink(
      to="/api-explorer"
    )
      v-icon(
        icon="mdi-code-braces"
      )
</template>

<style scoped lang="stylus">
header
  line-height 1.5
  max-height 100vh
  padding 0 10px
  display flex
  align-items center
  background-color #2d2d2d
  --color-text: var(--vt-c-text-dark-2);

  .logo
    --logo-size 65px
    display block
    filter invert(1)
    height var(--logo-size)
    width var(--logo-size)
    margin 5px

  nav
    width 100%
    margin-left 5px
    font-size 1.25rem
    display flex

    a
      padding 0 1rem
      white-space nowrap

      &.router-link-exact-active
        color var(--color-text)
        &:hover
          background-color transparent

    .spacer
      width 100%

@media screen and (max-width: 900px)
  header .logo
    --logo-size 40px
</style>