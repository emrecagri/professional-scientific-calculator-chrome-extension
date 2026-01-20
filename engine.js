const PRECISION = 1e14;
const MAX_HISTORY_ITEMS = 100;

const EngineUtils = {
    // Güvenli float işlemleri
    fix(num) {
        return parseFloat(Number(num).toPrecision(13));
    },

    // Faktöriyel
    factorial(n) {
        if (n < 0) return NaN;
        if (n > 170) return Infinity;
        if (n === 0 || n === 1) return 1;
        let r = 1;
        for (let i = 2; i <= n; i++) r *= i;
        return r;
    },

    // Kesir Dönüştürücü (Continued Fraction Algoritması)
    floatToFraction(val) {
        if (!isFinite(val)) return null;
        if (Number.isInteger(val)) return { n: val, d: 1, w: 0 };
        
        const tolerance = 1.0E-9;
        let sign = val < 0 ? -1 : 1;
        val = Math.abs(val);
        
        let whole = Math.floor(val);
        let fractionPart = val - whole;
        
        if (fractionPart < tolerance) return { n: whole * sign, d: 1, w: 0 };

        let x = fractionPart;
        let a = Math.floor(x);
        let h1 = 1, k1 = 0, h = a, k = 1;

        while (x - a > tolerance * k * k) {
            x = 1 / (x - a);
            a = Math.floor(x);
            let h2 = h1; h1 = h;
            let k2 = k1; k1 = k;
            h = h1 * a + h2;
            k = k1 * a + k2;
            // Payda çok büyürse dur
            if (k > 10000) break; 
        }
        
        return { n: h * sign, d: k, w: whole * sign };
    },

    format(num) {
        if (!isFinite(num)) return "Error";
        let str = this.fix(num).toString();
        if (Math.abs(num) > 1e14 || (Math.abs(num) < 1e-9 && num !== 0)) {
            return num.toExponential(6).replace('+', '');
        }
        return str;
    }
};

class CalculatorCore {
    constructor() {
        this.currentVal = '0';
        this.prevVal = null;
        this.op = null;
        this.resetNext = false;
        
        // States
        this.memory = 0;
        this.angleMode = 'DEG'; // 'DEG' | 'RAD'
        this.displayMode = 'DEC'; // 'DEC' | 'FRAC'
        
        this.loadState();
    }

    loadState() {
        if (chrome && chrome.storage) {
            chrome.storage.local.get(['memory', 'angleMode', 'displayMode'], (res) => {
                if (res.memory) this.memory = parseFloat(res.memory);
                if (res.angleMode) this.angleMode = res.angleMode;
                if (res.displayMode) this.displayMode = res.displayMode;
                this.emitChange();
            });
        }
    }

    saveState() {
        if (chrome && chrome.storage) {
            chrome.storage.local.set({
                memory: this.memory,
                angleMode: this.angleMode,
                displayMode: this.displayMode
            });
        }
    }

    inputDigit(digit) {
        if (this.resetNext) {
            this.currentVal = '';
            this.resetNext = false;
        }
        if (digit === '.' && this.currentVal.includes('.')) return;
        if (this.currentVal === '0' && digit !== '.') this.currentVal = digit;
        else this.currentVal += digit;
        
        // Max limit
        if (this.currentVal.length > 16) this.currentVal = this.currentVal.slice(0, 16);
    }

    backspace() {
        if (this.resetNext) return;
        this.currentVal = this.currentVal.toString().slice(0, -1);
        if (this.currentVal === '' || this.currentVal === '-') this.currentVal = '0';
    }

    setOp(operation) {
        if (this.currentVal === '') return;
        if (this.prevVal !== null) this.calc();
        this.op = operation;
        this.prevVal = this.currentVal;
        this.resetNext = true;
    }

    calc() {
        if (this.prevVal === null || this.op === null) return;
        
        const a = parseFloat(this.prevVal);
        const b = parseFloat(this.currentVal);
        let res = 0;

        if (isNaN(a) || isNaN(b)) return;

        switch (this.op) {
            case 'add': res = (a * PRECISION + b * PRECISION) / PRECISION; break;
            case 'sub': res = (a * PRECISION - b * PRECISION) / PRECISION; break;
            case 'mul': res = (a * PRECISION * (b * PRECISION)) / (PRECISION * PRECISION); break;
            case 'div': 
                if (b === 0) { this.currentVal = 'Error'; this.resetNext = true; return; }
                res = a / b; break;
            case 'pow': res = Math.pow(a, b); break;
        }

        const eq = `${EngineUtils.format(a)} ${this.getSymbol(this.op)} ${EngineUtils.format(b)}`;
        this.addHistory(eq, EngineUtils.format(res));

        this.currentVal = EngineUtils.format(res);
        this.op = null;
        this.prevVal = null;
        this.resetNext = true;
    }

    execFn(fn) {
        let val = parseFloat(this.currentVal);
        if (isNaN(val)) return;
        let res = 0;

        // Açı dönüşümü
        const toRad = (n) => this.angleMode === 'DEG' ? n * (Math.PI / 180) : n;
        const toDeg = (n) => this.angleMode === 'DEG' ? n * (180 / Math.PI) : n; // Inverse için gerekebilir

        try {
            switch(fn) {
                case 'sin': res = Math.sin(toRad(val)); break;
                case 'cos': res = Math.cos(toRad(val)); break;
                case 'tan': res = Math.tan(toRad(val)); break;
                
                case 'sinh': res = Math.sinh(val); break;
                case 'cosh': res = Math.cosh(val); break;
                case 'tanh': res = Math.tanh(val); break;

                case 'log': res = Math.log10(val); break;
                case 'ln': res = Math.log(val); break;
                case 'sqrt': if(val < 0) throw 1; res = Math.sqrt(val); break;
                case 'fact': res = EngineUtils.factorial(val); break;
                case 'inv': if(val === 0) throw 1; res = 1 / val; break;
                case 'neg': res = val * -1; break;
                case 'percent': res = val / 100; break;
                
                case 'pi': res = Math.PI; break;
                case 'e': res = Math.E; break;
                case 'rand': res = Math.random(); break;
            }
        } catch (e) {
            this.currentVal = "Error";
            this.resetNext = true;
            return;
        }

        this.currentVal = EngineUtils.format(res);
        this.resetNext = true;
    }

    mem(action) {
        const val = parseFloat(this.currentVal);
        if (isNaN(val)) return;
        
        if (action === 'mc') this.memory = 0;
        if (action === 'mr') { this.currentVal = EngineUtils.format(this.memory); this.resetNext = true; }
        if (action === 'm+') this.memory += val;
        if (action === 'm-') this.memory -= val;
        
        this.saveState();
        this.emitChange();
    }

    clear() {
        this.currentVal = '0';
        this.prevVal = null;
        this.op = null;
        this.resetNext = false;
    }

    toggleAngle() {
        this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
        this.saveState();
        this.emitChange();
    }

    toggleDisplay() {
        this.displayMode = this.displayMode === 'DEC' ? 'FRAC' : 'DEC';
        this.saveState();
        this.emitChange();
    }

    // --- Yardımcılar ---

    getSymbol(op) {
        const m = {'add':'+','sub':'-','mul':'×','div':'÷','pow':'^'};
        return m[op] || '';
    }

    addHistory(eq, res) {
        document.dispatchEvent(new CustomEvent('history-push', { detail: { eq, res } }));
    }

    emitChange() {
        document.dispatchEvent(new CustomEvent('state-change'));
    }

    getHTML() {
        if (this.currentVal === "Error") return "Error";
        
        // Fraction modu kontrolü.
        if (this.displayMode === 'FRAC' && !this.resetNext && this.op === null) {
            // Sadece sonuç gösterirken veya işlem bitmişse kesir göster, yazarken değil.
            // Aslında kullanıcı tercihi: Her zaman mı? 
            // Kullanıcı deneyimi için: Sadece sayı "sabitse" kesre çevir.
        }

        // Kullanıcı yazıyorsa (resetNext = false) ve operatör yoksa, genellikle ham sayıyı göster.
        // Ama kullanıcı "DEC" modundan "FRAC" moduna geçtiyse görmek ister.
        // O yüzden her zaman çevirme denenecektir.
        
        if (this.displayMode === 'FRAC') {
            const val = parseFloat(this.currentVal);
            const frac = EngineUtils.floatToFraction(val);
            
            if (frac && frac.d !== 1 && frac.d < 10000) {
                // Bileşik kesir gösterimi (Basitlik için tam sayıyı paya katalım)
                const totalN = Math.abs(frac.w * frac.d) + frac.n;
                const sign = val < 0 ? '-' : '';
                
                return `<div style="display:inline-flex; align-items:center">
                            <span style="margin-right:2px; font-size:30px">${sign}</span>
                            <div class="fraction-wrap">
                                <span class="frac-top">${totalN}</span>
                                <span class="frac-bottom">${frac.d}</span>
                            </div>
                        </div>`;
            }
        }
        
        return this.currentVal;
    }
}

window.Calculator = new CalculatorCore();