<script lang="ts">
  import { page } from "$app/state";
  import AppError from "$lib/components/app-error.svelte";
</script>

<svelte:head>
  <title>{page.status} - EMS</title>
</svelte:head>

<div class="flex min-h-svh flex-col">
  <AppError />
</div>
