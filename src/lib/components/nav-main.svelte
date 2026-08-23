<script lang="ts">
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import * as Collapsible from "$lib/components/ui/collapsible/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";

	let {
		items,
	}: {
		items: {
			title: string;
			url: string;
			// This should be `Component` after @lucide/svelte updates types
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			icon: any;
			defaultOpen?: boolean;
			active: boolean;
			items: {
				title: string;
				url: string;
				active: boolean;
			}[];
		}[];
	} = $props();
</script>

{#if items.length > 0}
	<Sidebar.Group>
		<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
		<Sidebar.Menu>
			{#each items as mainItem (mainItem.title)}
				<Collapsible.Root
					open={mainItem.defaultOpen || mainItem.items.some((item) => item.active)}
				>
					{#snippet child({ props })}
						<Sidebar.MenuItem {...props}>
							<Sidebar.MenuButton tooltipContent={mainItem.title} isActive={mainItem.active}>
								{#snippet child({ props })}
									<a
										href={mainItem.url}
										aria-current={mainItem.active ? "page" : undefined}
										{...props}
									>
										<mainItem.icon />
										<span>{mainItem.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
							{#if mainItem.items.length}
								<Collapsible.Trigger>
									{#snippet child({ props })}
										<Sidebar.MenuAction {...props} class="data-[state=open]:rotate-90">
											<ChevronRightIcon />
											<span class="sr-only">Toggle</span>
										</Sidebar.MenuAction>
									{/snippet}
								</Collapsible.Trigger>
								<Collapsible.Content>
									<Sidebar.MenuSub>
										{#each mainItem.items as subItem (subItem.title)}
											<Sidebar.MenuSubItem>
												<Sidebar.MenuSubButton
													href={subItem.url}
													isActive={subItem.active}
													aria-current={subItem.active ? "page" : undefined}
												>
													<span>{subItem.title}</span>
												</Sidebar.MenuSubButton>
											</Sidebar.MenuSubItem>
										{/each}
									</Sidebar.MenuSub>
								</Collapsible.Content>
							{/if}
						</Sidebar.MenuItem>
					{/snippet}
				</Collapsible.Root>
			{/each}
		</Sidebar.Menu>
	</Sidebar.Group>
{/if}
