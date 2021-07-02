<script>
    import PermissonComponent from './PermissonComponent.svelte';
    import InputPathComponent from './InputPathComponent.svelte';

    let ownerNumber;
    let groupNumber;
    let otherNumber;
    
    $: permissionNumber = String(ownerNumber) + String(groupNumber) + String(otherNumber);
    
</script>

<div class="wrapper">
    <PermissonComponent ownershipName="Owner" bind:decimalExecutionRight={ownerNumber}/>
    <PermissonComponent ownershipName="Group" bind:decimalExecutionRight={groupNumber}/>
    <PermissonComponent ownershipName="Other" bind:decimalExecutionRight={otherNumber}/>
</div>
<InputPathComponent permissionNumber={permissionNumber}/>

<style>
    .wrapper {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        justify-items: center;
        align-items: center;
        width: 640px;
        margin: 0 auto;
        margin-bottom: 32px;
    }
</style>