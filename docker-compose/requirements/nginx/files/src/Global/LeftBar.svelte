<script lang='ts'>
	import { Link } from 'svelte-routing';

	export let menu: any;

	const styleButton = "margin-block: 0.2rem; border-radius: 0.4rem; padding: 0.4rem; display: flex; align-items: center;";
</script>

<main>
	<div id="left-bar" style="background-color: {menu.dominantColor}; padding-bottom: 0.5rem; border: 1px solid #c7c7c72b;box-shadow: 0 0 5px #0000003b; {menu.selected !== 3 ? 'border-radius: 0.5rem;' : ''}">
		<img src="/img/logo_black.png" alt="logo" id="logo" style="width: 3rem; margin-block: 1rem;" />
		<Link to="/home" style="{styleButton}{menu.selected === 0 ? 'background-color: #c7c7c7af;' : ''}">
			<img src="/img/home.png" alt="home" />
		</Link>
		<Link to="/search" style="{styleButton}{menu.selected === 1 ? 'background-color: #c7c7c7af;' : ''}">
			<img src="/img/search.png" alt="search" />
		</Link>
		<Link to="/list" style="{styleButton}{menu.selected === 2 ? 'background-color: #c7c7c7af;' : ''}">
			<img src="/img/resume.png" alt="list" />
		</Link>
		<Link to="/download" style="{styleButton}{menu.selected === 6 ? 'background-color: #c7c7c7af;' : ''}">
			<img src="/img/download.png" alt="download" />
		</Link>
		<div style="margin-block: auto;"></div>
		<Link to="/choose_user" style="{styleButton}">
			<img src="/img/account.png" alt="profile" />
		</Link>
	</div>
</main>

<style>
	#left-bar {
		width: 80px;
		height: 100%;
		border-radius: 0.5rem 0 0 0.5rem;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: background-color 0.5s;
	}
	#left-bar #logo {
		color: #fff;
		font-size: 1rem;
		margin-block: 1.5rem;
	}
	#left-bar img {
		width: 1.8rem;
	}
	#logo {
		margin-block: 1rem;
		filter: invert(1);
	}
</style>