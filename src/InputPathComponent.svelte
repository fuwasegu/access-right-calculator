<script>
    import SvelteTooltip from 'svelte-tooltip';

    export let permissionNumber = '';
    
    let path = '';
    let inputedPath = '';
    let chmod = '';
    let number = '';
    let optionF = '';
    let optionR = '';
    let optionV = '';
    let options = '';
    let isOptionF  = false;
    let isOptionR = false;
    let isOptionV = false;

    const createCommand = () => {
        chmod = 'chmod';
        number = permissionNumber;
        path = inputedPath;
        if (isOptionR) {
            optionR = '-R ';
        } else {
            optionR = '';
        }
        if (isOptionV) {
            optionV = '-v ';
        } else {
            optionV = '';
        }
        if (isOptionF) {
            optionF = '-f ';
        } else {
            optionF = '';
        }
        options = optionR + optionV + optionF;
    }

    const clearCommand = () => {
        chmod = '';
        number = '';
        path = '';
        optionF = '';
        optionR = '';
        optionV = '';
        options = '';
        inputedPath = '';
        isOptionF  = false;
        isOptionR = false;
        isOptionV = false;
    }

    const copyToaClipboad = () => {
        let range = document.createRange();
        let span = document.getElementById('copy-target');
        range.selectNodeContents(span);
        let selection = document.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('copy');
        alert('Copied!');
    }
</script>

<div class="container">
    <label class="path-label-area">
        Path (Directry or File)<input name="path" type="text" bind:value="{inputedPath}" placeholder="example: /your-project/src/main.py">
    </label>
    <div class="options-area">
        <span>Options</span>
        <SvelteTooltip tip="Change files and directories recursively." >
            <label for="option-r"><input type="checkbox" id="option-r" bind:checked={isOptionR}>-R</label>
        </SvelteTooltip>
        <SvelteTooltip tip="Verbose mode; output a diagnostic message for every file processed." >
            <label for="option-v"><input type="checkbox" id="option-v" bind:checked={isOptionV}>-v</label></SvelteTooltip>
        <SvelteTooltip tip="Quiet mode; suppress most error messages." >
            <label for="option-f"><input type="checkbox" id="option-f" bind:checked={isOptionF}>-f</label>
        </SvelteTooltip>
    </div>
    <div class="button-area">
        <button on:click="{createCommand}">Create Command!</button>
        <button on:click="{clearCommand}">Clear</button>
    </div>
    
</div>

<div class="code-area">
    <div class="copy-area" on:click="{copyToaClipboad}"><i class="fas fa-paste" style="color: white;"></i></div>
    <span class="code">$ &nbsp; <span id="copy-target">{chmod} {options} {number} {path}</span></span>
</div>

<style>
    input[type="text"] {
        width: 300px;
        margin-left: 64px;
    }
    input[type="checkbox"] {
        margin-right: 8px;
    }
    .path-label-area {
        margin-bottom: 32px;
    }
    .container {
        margin-bottom: 32px;
    }
    .options-area {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        justify-items: center;
        align-items: center;
        width: 512px;
        margin: 0 auto;
        margin-bottom: 32px;
    }
    .code-area {
        background-color: #364449;
        width: 640px;
        height: 64px;
        margin-left: auto;
        margin-right: auto;
        display: table;
    }
    .code {
        color: white;
        vertical-align: middle;
        display: inline-block;
        height: 32px;
        width: 512px;
        margin-top: 16px;
        font-size: 1.6em;
        text-align: left;
        margin-left: 64px;
        margin-right: 64px;
        white-space:nowrap;
        overflow-x: scroll;
        -ms-overflow-style: none;    /* IE, Edge 対応 */
        scrollbar-width: none;       /* Firefox 対応 */
    }
    .code::-webkit-scrollbar {
        display:none;     /* Chrome, Safari 対応 */
    }
    .copy-area {
        margin: 10px;
        position: absolute;
        margin-left: 610px;
    }
    .copy-area:hover {
        transform: scale(1.5, 1.5);
    }
    #copy-target {
        user-select: auto;
    }
</style>