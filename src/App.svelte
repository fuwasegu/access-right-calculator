<script>
	import Header from './Header.svelte';
	import PermissonTable from './PermissonTable.svelte';
</script>

<Header />
<main>
	<PermissonTable />
</main>

<style>
	main {
		text-align: center;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>