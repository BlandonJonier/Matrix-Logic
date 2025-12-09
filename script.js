/* MATRIX LOGIC 2.0 - Sistema Dinámico Multi-Matriz */

document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL ---
    // Aquí guardamos cuántas matrices quiere el usuario (mínimo 1)
    let matrixCount = 0; 
    let currentOp = 'add';

    // --- REFERENCIAS ---
    const opSelect = document.getElementById('operation-select');
    const configContainer = document.getElementById('matrices-config-container');
    const dynamicControls = document.getElementById('dynamic-controls');
    const btnAdd = document.getElementById('btn-add-matrix');
    const btnRemove = document.getElementById('btn-remove-matrix');
    const btnGenerate = document.getElementById('btn-generate');
    const inputSection = document.getElementById('matrix-input-section');
    const inputContainer = document.getElementById('matrices-input-container');
    const btnCalculate = document.getElementById('btn-calculate');
    const resultSection = document.getElementById('results-section');
    const resultContainer = document.getElementById('result-container');
    const errorMessage = document.getElementById('error-message');

    // --- INICIALIZACIÓN ---
    init();

    function init() {
        // Al cargar, empezamos con una configuración estándar (Suma de 2 matrices)
        updateOperationMode();
    }

    // --- 1. LÓGICA DE CONFIGURACIÓN DINÁMICA ---

    opSelect.addEventListener('change', updateOperationMode);

    function updateOperationMode() {
        currentOp = opSelect.value;
        const singleMatrixOps = ['determinant', 'inverse2x2'];
        const isSingle = singleMatrixOps.includes(currentOp);

        // Limpiar configuración anterior
        configContainer.innerHTML = '';
        inputSection.style.display = 'none';
        resultSection.style.display = 'none';

        if (isSingle) {
            // Si es determinante/inversa, solo permitimos 1 matriz y ocultamos botones de agregar
            dynamicControls.style.display = 'none';
            addMatrixConfig(0); // Matriz A
            matrixCount = 1;
        } else {
            // Si es aritmética, permitimos agregar/quitar. Empezamos con 2.
            dynamicControls.style.display = 'block';
            addMatrixConfig(0); // Matriz A
            addMatrixConfig(1); // Matriz B
            matrixCount = 2;
        }
    }

    // Agregar nueva configuración de dimensiones
    btnAdd.addEventListener('click', () => {
        addMatrixConfig(matrixCount);
        matrixCount++;
    });

    // Quitar la última matriz
    btnRemove.addEventListener('click', () => {
        if (matrixCount > 2) { // Mínimo 2 para operaciones aritméticas
            configContainer.removeChild(configContainer.lastChild);
            matrixCount--;
        }
    });

    function addMatrixConfig(index) {
        const letter = String.fromCharCode(65 + index); // 0=A, 1=B, 2=C...
        
        const div = document.createElement('div');
        div.className = 'dimensions-container';
        div.id = `config-matrix-${index}`;
        div.innerHTML = `
            <h3>Matriz ${letter}</h3>
            <label>Filas: <input type="number" class="dims-row" data-index="${index}" value="2" min="1"></label>
            <label>Cols: <input type="number" class="dims-col" data-index="${index}" value="2" min="1"></label>
        `;
        configContainer.appendChild(div);
    }

    // --- 2. GENERACIÓN DE LA INTERFAZ DE INGRESO ---

    btnGenerate.addEventListener('click', () => {
        inputContainer.innerHTML = ''; // Limpiar
        errorMessage.textContent = '';
        resultSection.style.display = 'none';

        // Validar y Crear Grillas
        for (let i = 0; i < matrixCount; i++) {
            const rowsInput = document.querySelector(`.dims-row[data-index="${i}"]`);
            const colsInput = document.querySelector(`.dims-col[data-index="${i}"]`);
            
            const rows = parseInt(rowsInput.value);
            const cols = parseInt(colsInput.value);

            if (rows < 1 || cols < 1 || isNaN(rows) || isNaN(cols)) {
                showError("Las dimensiones deben ser enteros positivos.");
                return;
            }

            // Si no es la primera, agregar el símbolo de operación antes
            if (i > 0) {
                const symbol = document.createElement('div');
                symbol.className = 'operator-sign';
                symbol.textContent = getOperatorSymbol(currentOp);
                inputContainer.appendChild(symbol);
            }

            createMatrixGrid(i, rows, cols);
        }

        inputSection.style.display = 'block';
    });

    function createMatrixGrid(index, rows, cols) {
        const letter = String.fromCharCode(65 + index);
        const container = document.createElement('div');
        container.className = 'matrix-container';
        
        container.innerHTML = `<h3>${letter}</h3>`;
        const grid = document.createElement('div');
        grid.className = 'matrix-grid';
        grid.style.gridTemplateColumns = `repeat(${cols}, 60px)`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.className = 'matrix-cell';
                input.dataset.row = r;
                input.dataset.col = c;
                input.dataset.matrixIndex = index; // Importante para saber de qué matriz es
                input.placeholder = `${r+1},${c+1}`;
                grid.appendChild(input);
            }
        }
        container.appendChild(grid);
        inputContainer.appendChild(container);
    }

    // --- 3. CÁLCULOS Y PROCESAMIENTO ---

    btnCalculate.addEventListener('click', () => {
        errorMessage.textContent = '';
        
        try {
            // Recolectar todas las matrices ingresadas
            const matrices = [];
            for (let i = 0; i < matrixCount; i++) {
                const configRow = document.querySelector(`.dims-row[data-index="${i}"]`);
                const configCol = document.querySelector(`.dims-col[data-index="${i}"]`);
                const rows = parseInt(configRow.value);
                const cols = parseInt(configCol.value);
                
                const matrixData = getMatrixValues(i, rows, cols);
                matrices.push({ data: matrixData, rows: rows, cols: cols });
            }

            let result = null;

            if (currentOp === 'determinant') {
                if (matrices[0].rows !== matrices[0].cols) throw new Error("Debe ser cuadrada.");
                const val = calculateDeterminant(matrices[0].data);
                displayResult(val, 'scalar');

            } else if (currentOp === 'inverse2x2') {
                if (matrices[0].rows !== 2 || matrices[0].cols !== 2) throw new Error("Solo matrices 2x2.");
                const det = calculateDeterminant(matrices[0].data);
                if (det === 0) throw new Error("Matriz Singular (Det=0). No tiene inversa.");
                const inv = calculateInverse2x2(matrices[0].data, det);
                displayResult({ data: inv, rows: 2, cols: 2 }, 'matrix');

            } else {
                // Operaciones Aritméticas (Suma, Resta, Multiplicación)
                // Usamos 'reduce' para operar secuencialmente: ((A + B) + C) + D...
                
                result = matrices.reduce((acc, curr, index) => {
                    if (index === 0) return curr; // La primera matriz es el punto de partida

                    if (currentOp === 'add') {
                        if (acc.rows !== curr.rows || acc.cols !== curr.cols) 
                            throw new Error(`Dimensiones incompatibles en Matriz ${String.fromCharCode(65+index)}`);
                        return operateElementWise(acc, curr, (a, b) => a + b);
                    }
                    if (currentOp === 'subtract') {
                        if (acc.rows !== curr.rows || acc.cols !== curr.cols) 
                            throw new Error(`Dimensiones incompatibles en Matriz ${String.fromCharCode(65+index)}`);
                        return operateElementWise(acc, curr, (a, b) => a - b);
                    }
                    if (currentOp === 'multiply') {
                        if (acc.cols !== curr.rows)
                            throw new Error(`No se puede multiplicar: Cols de acumulado (${acc.cols}) != Filas de ${String.fromCharCode(65+index)} (${curr.rows})`);
                        return multiplyMatrices(acc, curr);
                    }
                }, null); // Valor inicial null, se llena en index 0

                displayResult(result, 'matrix');
            }

        } catch (e) {
            showError(e.message);
        }
    });

    // --- FUNCIONES AUXILIARES ---

    function getMatrixValues(index, rows, cols) {
        let data = [];
        for (let r = 0; r < rows; r++) {
            let row = [];
            for (let c = 0; c < cols; c++) {
                // Selector específico para encontrar el input exacto
                const input = document.querySelector(`input[data-matrix-index="${index}"][data-row="${r}"][data-col="${c}"]`);
                const val = parseFloat(input.value);
                if (isNaN(val)) throw new Error(`Valor inválido en Matriz ${String.fromCharCode(65+index)}`);
                row.push(val);
            }
            data.push(row);
        }
        return data;
    }

    function getOperatorSymbol(op) {
        if (op === 'add') return '+';
        if (op === 'subtract') return '-';
        if (op === 'multiply') return '×';
        return '';
    }

    function operateElementWise(mA, mB, func) {
        let newData = mA.data.map((row, i) => {
            return row.map((val, j) => func(val, mB.data[i][j]));
        });
        return { data: newData, rows: mA.rows, cols: mA.cols };
    }

    function multiplyMatrices(mA, mB) {
        let result = [];
        for (let i = 0; i < mA.rows; i++) {
            let row = [];
            for (let j = 0; j < mB.cols; j++) {
                let sum = 0;
                for (let k = 0; k < mA.cols; k++) {
                    sum += mA.data[i][k] * mB.data[k][j];
                }
                row.push(sum);
            }
            result.push(row);
        }
        return { data: result, rows: mA.rows, cols: mB.cols };
    }

    function calculateDeterminant(m) {
        if (m.length === 1) return m[0][0];
        if (m.length === 2) return m[0][0]*m[1][1] - m[0][1]*m[1][0];
        // Recursivo básico para n>2
        let det = 0;
        for (let j = 0; j < m.length; j++) {
            det += m[0][j] * Math.pow(-1, j) * calculateDeterminant(m.slice(1).map(r => r.filter((_, i) => i !== j)));
        }
        return det;
    }

    function calculateInverse2x2(m, det) {
        return [
            [m[1][1]/det, -m[0][1]/det],
            [-m[1][0]/det, m[0][0]/det]
        ];
    }

    function displayResult(content, type) {
        resultContainer.innerHTML = '';
        resultSection.style.display = 'block';

        if (type === 'scalar') {
            resultContainer.innerHTML = `<h3>${content}</h3>`;
        } else {
            const grid = document.createElement('div');
            grid.className = 'matrix-grid';
            grid.style.borderColor = '#00e5ff';
            grid.style.gridTemplateColumns = `repeat(${content.cols}, 60px)`;
            
            content.data.forEach(row => {
                row.forEach(val => {
                    const cell = document.createElement('div');
                    cell.className = 'matrix-cell';
                    cell.style.display='flex'; cell.style.justifyContent='center'; cell.style.alignItems='center';
                    cell.textContent = Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
                    grid.appendChild(cell);
                });
            });
            resultContainer.appendChild(grid);
        }
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        resultSection.style.display = 'none';
    }
});