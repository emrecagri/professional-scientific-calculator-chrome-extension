document.addEventListener('DOMContentLoaded', () => {
    const calc = window.Calculator;
    
    // UI References
    const displayRes = document.getElementById('resultDisplay');
    const displayExpr = document.getElementById('expressionDisplay');
    const toast = document.getElementById('copyToast');
    
    const historyOverlay = document.getElementById('historyOverlay');
    const historyList = document.getElementById('historyList');
    
    const btnFormat = document.getElementById('formatToggle');
    const btnAngle = document.getElementById('angleBtn');
    const memInd = document.getElementById('memoryIndicator');

    function render() {
        // Ekran
        displayRes.innerHTML = calc.getHTML();
        
        if (calc.op) {
            displayExpr.innerText = `${calc.prevVal} ${calc.getSymbol(calc.op)}`;
        } else {
            displayExpr.innerText = '';
        }

        // Buton Durumları
        btnFormat.innerText = calc.displayMode;
        btnAngle.innerText = calc.angleMode;
        
        if (calc.memory !== 0) memInd.classList.remove('hidden');
        else memInd.classList.add('hidden');
    }

    document.getElementById('mainKeypad').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const d = btn.dataset;
        
        // Efekt
        btn.style.transform = "scale(0.95)";
        setTimeout(() => btn.style.transform = "scale(1)", 100);

        if (d.val !== undefined) calc.inputDigit(d.val);
        else if (d.cmd === 'clear') calc.clear();
        else if (d.cmd === 'backspace') calc.backspace();
        else if (d.cmd === 'calc') calc.calc();
        else if (d.cmd === 'angle-toggle') calc.toggleAngle();
        else if (d.cmd === 'neg') calc.execFn('neg');
        else if (['add','sub','mul','div'].includes(d.cmd)) calc.setOp(d.cmd);
        else if (['sin','cos','tan','log','ln','sqrt','pow','fact','pi','e','inv','percent','sinh','cosh','tanh','rand'].includes(d.cmd)) calc.execFn(d.cmd);
        else if (['mc','mr','m+','m-'].includes(d.cmd)) calc.mem(d.cmd);

        render();
    });

    document.getElementById('formatToggle').addEventListener('click', () => {
        calc.toggleDisplay();
        render();
    });

    document.getElementById('modeTrigger').addEventListener('click', () => {
        document.body.classList.toggle('expanded');
    });

    const historyBtn = document.getElementById('historyTrigger');
    const historyClose = document.getElementById('historyClose');
    const historyClear = document.getElementById('historyClear');

    function toggleHistory() {
        historyOverlay.classList.toggle('open');
    }

    historyBtn.addEventListener('click', toggleHistory);
    historyClose.addEventListener('click', toggleHistory);
    
    historyClear.addEventListener('click', () => {
        historyList.innerHTML = '';
    });

    document.addEventListener('history-push', (e) => {
        const { eq, res } = e.detail;
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span class="h-expr">${eq}</span><span class="h-result">= ${res}</span>`;
        
        item.addEventListener('click', () => {
            calc.currentVal = res.toString();
            calc.resetNext = true;
            render();
            toggleHistory(); // Kapat
        });

        historyList.prepend(item);
    });

    document.getElementById('displayArea').addEventListener('click', () => {
        // HTML temizle, sadece sayı al
        const text = displayRes.innerText.replace(/\n/g, '').replace(/\s+/g, ''); 
        // Basitçe currentVal kopyala daha güvenli
        navigator.clipboard.writeText(calc.currentVal).then(() => {
            toast.classList.add('visible');
            setTimeout(() => toast.classList.remove('visible'), 1000);
        });
    });

    document.addEventListener('keydown', (e) => {
        const k = e.key;
        if (/[0-9]/.test(k)) calc.inputDigit(k);
        if (k === '.') calc.inputDigit('.');
        if (k === 'Enter' || k === '=') { e.preventDefault(); calc.calc(); }
        if (k === 'Backspace') calc.backspace();
        if (k === 'Escape') calc.clear();
        if (k === '+') calc.setOp('add');
        if (k === '-') calc.setOp('sub');
        if (k === '*') calc.setOp('mul');
        if (k === '/') { e.preventDefault(); calc.setOp('div'); }
        render();
    });

    document.addEventListener('state-change', render);

    render();
});