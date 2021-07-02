<script>
    import SvelteTooltip from 'svelte-tooltip';
    import { onMount } from 'svelte'

    export let ownershipName;
    export let decimalExecutionRight;

    let activeRead = false;
    let activeWrite = false;
    let activeExecutable = false;

    let discription = '';

    const calcExecutionRight = (read, write, executable) => {
        decimalExecutionRight = 4*read + 2*write + executable;
    }

    $: activeReadBinaly = activeRead ? 1: 0;
    $: activeWriteBinaly = activeWrite ? 1: 0;
    $: activeExecutableBinaly = activeExecutable ? 1: 0;

    $: calcExecutionRight(activeReadBinaly, activeWriteBinaly, activeExecutableBinaly);

    onMount(() => {
        switch(ownershipName) {
            case 'Owner':
                discription = 'Permissions used by the assigned owner of the file or directory';
                break;
            case 'Group':
                discription = 'Permissions used by members of the group that owns the file or directory';
                break;
            case 'Other':
                discription = 'Permissions used by all users other than the file owner, and members of the group that owns the file or the directory';
                break;
        }
    });
</script>

<div class="ownership-area">
    <div class="ownership-name-area">
        <SvelteTooltip tip="{discription}" top >
            <span class="ownership-name">{ownershipName}</span>
        </SvelteTooltip>
    </div>
    <div class="input-area">
        <SvelteTooltip tip="{ownershipName} can read" top >
            <button class:active={activeRead} on:click="{() => activeRead = !activeRead}">r</button>
        </SvelteTooltip>
        <SvelteTooltip tip="{ownershipName} can write" top >
            <button class:active={activeWrite} on:click="{() => activeWrite = !activeWrite}">w</button>
        </SvelteTooltip>
        <SvelteTooltip tip="{ownershipName} can execute" top >
            <button class:active={activeExecutable} on:click="{() => activeExecutable = !activeExecutable}">x</button>
        </SvelteTooltip>
    </div>
    <div class="binary-area">
        <span class="binaly-digit-area">{activeReadBinaly}</span>
        <span class="binaly-digit-area">{activeWriteBinaly}</span>
        <span class="binaly-digit-area">{activeExecutableBinaly}</span>
    </div>
    <div class="decimal-area">
        <span class="decimal-digit-area">{decimalExecutionRight}</span>
    </div>

</div>

<style>
    .ownership-area {
        display: grid;
        width: 120px;
    }
    .active {
		background-color: pink;
	}
    button {
        width: 32px;
        height: 32px;
    }
    .binary-area {
        height: 32px;
        line-height: 32px;
    }
    .binaly-digit-area {
        display: inline-block;
        vertical-align: middle;
        width: 32px;
        height: 32px;
    }
    .ownership-name-area, .input-area, .binary-area, .decimal-area{
        margin-bottom: 16px;
    }
</style>