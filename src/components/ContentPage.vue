<!-- Scrollable page shell for content views. The footer is global (App.vue),
     so this is purely the scroll container filling the area above it.
     The grid makes the slotted view stretch to at least the full viewport area
     (so centered layouts work) while still growing for long content. -->
<template>
  <div class="h-full overflow-y-auto">
    <div class="min-h-full grid grid-cols-1">
      <slot />
    </div>
  </div>
</template>
