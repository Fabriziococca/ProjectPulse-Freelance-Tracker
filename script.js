document.addEventListener("DOMContentLoaded", () => {
    
    // --- CONSTANTES DE ARQUITECTURA ---
    const FIXED_FEE = 0.0732; // 7.32% (Costo operativo de retiro PayPal/Lemon)

    // --- ELEMENTOS DEL DOM: FORMULARIO ---
    const form = document.getElementById('projectForm');
    const inputClientName = document.getElementById('clientName');
    const inputProjectName = document.getElementById('projectName');
    const inputAcceptDate = document.getElementById('acceptDate');
    const inputDeliveryDays = document.getElementById('deliveryDays');
    const inputBudgetGross = document.getElementById('budgetGross');
    const currencySelect = document.getElementById('currencySelect');
    const workanaFeeSelect = document.getElementById('workanaFeeSelect');
    const customFeeContainer = document.getElementById('customFeeContainer');
    const inputCustomWorkanaFee = document.getElementById('customWorkanaFee');
    const btnReload = document.getElementById('btnReload');
    
    // --- ELEMENTOS DEL DOM: DASHBOARD ---
    const projectsList = document.getElementById('projectsList');
    const activeCount = document.getElementById('activeCount');
    
    const activeUSD = document.getElementById('activeUSD');
    const activeARS = document.getElementById('activeARS');
    const monthUSD = document.getElementById('monthUSD');
    const monthARS = document.getElementById('monthARS');
    const totalUSD = document.getElementById('totalUSD');
    const totalARS = document.getElementById('totalARS');

    // --- ELEMENTOS DEL DOM: MODAL DE EDICIÓN ---
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const inputExtraDays = document.getElementById('extraDays');
    const inputExtraBudget = document.getElementById('extraBudget');
    const btnModalCancel = document.getElementById('modal-cancel');
    const btnModalSave = document.getElementById('modal-save');

    // --- ELEMENTOS DEL DOM: HISTORIAL MENSUAL ---
    const btnOpenHistory = document.getElementById('btnOpenHistory');
    const modalMonthlyHistory = document.getElementById('monthly-history-modal');
    const btnCloseHistoryModal = document.getElementById('close-history-modal');
    const monthlyHistoryList = document.getElementById('monthlyHistoryList');
    
    // --- ESTADO DE LA APLICACIÓN ---
    let projects = JSON.parse(localStorage.getItem('projectPulseData')) || [];
    let history = JSON.parse(localStorage.getItem('projectPulseHistory')) || [];
    let currentEditId = null;

    if (btnReload) {
        btnReload.addEventListener('click', () => {
            if (confirm('¿Quieres forzar la recarga de la app? Esto buscará la última versión en GitHub. Tus proyectos no se borrarán.')) {
                window.location.reload(true);
            }
        });
    }

    if (btnOpenHistory) {
        btnOpenHistory.addEventListener('click', () => {
            renderMonthlyHistory();
            modalMonthlyHistory.classList.remove('hidden');
        });
    }

    if (btnCloseHistoryModal) {
        btnCloseHistoryModal.addEventListener('click', () => {
            modalMonthlyHistory.classList.add('hidden');
        });
    }

    // --- LÓGICA DE INTERFAZ DINÁMICA ---
    workanaFeeSelect.addEventListener('change', () => {
        if (workanaFeeSelect.value === 'custom') {
            customFeeContainer.classList.remove('hidden');
        } else {
            customFeeContainer.classList.add('hidden');
        }
    });

    // --- CEREBRO FINANCIERO ---
    function calculateNet(gross, wFeeType, manualPercent, isDelegated = false) {
        let finalNet = 0;
        if (wFeeType === 'direct') {
            finalNet = gross;
        } else {
            let workanaPercent = (wFeeType === 'custom') ? (parseFloat(manualPercent) || 0) : parseFloat(wFeeType);
            const amountAfterWorkana = gross * (1 - (workanaPercent / 100));
            finalNet = amountAfterWorkana * (1 - FIXED_FEE);
        }
        
        if (isDelegated) {
            finalNet = finalNet * 0.30;
        }
        
        return parseFloat(finalNet.toFixed(2));
    }

    function setDefaultDate() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        inputAcceptDate.value = now.toISOString().slice(0, 16);
    }

    function formatDate(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
    }

    // --- GESTIÓN DE PROYECTOS ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const acceptedDate = new Date(inputAcceptDate.value);
        const days = parseInt(inputDeliveryDays.value);
        const gross = parseFloat(inputBudgetGross.value) || 0;
        
        const deadlineDate = new Date(acceptedDate.getTime() + (days * 24 * 60 * 60 * 1000));

        const isDelegatedInput = document.getElementById('isDelegated');
        const isDelegated = isDelegatedInput ? isDelegatedInput.checked : false;

        const newProject = {
            id: Date.now().toString(),
            client: inputClientName.value.trim(),
            project: inputProjectName.value.trim(),
            accepted: acceptedDate.toISOString(),
            days: days,
            deadline: deadlineDate.toISOString(),
            currency: currencySelect.value,
            budgetGross: gross,
            wFeeType: workanaFeeSelect.value,
            manualPercent: inputCustomWorkanaFee.value,
            isDelegated: isDelegated,
            budgetNet: calculateNet(gross, workanaFeeSelect.value, inputCustomWorkanaFee.value, isDelegated)
        };

        projects.push(newProject);
        saveAndRender();
        
        form.reset();
        setDefaultDate();
        customFeeContainer.classList.add('hidden');
        if (isDelegatedInput) isDelegatedInput.checked = false;
    });

    window.openEditModal = (id) => {
        currentEditId = id;
        const p = projects.find(proj => proj.id === id);
        modalTitle.innerText = `Gestionar: ${p.client}`;
        inputExtraDays.value = 0;
        inputExtraBudget.value = 0;
        modal.classList.remove('hidden');
    };

    btnModalCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
        currentEditId = null;
    });

    btnModalSave.addEventListener('click', () => {
        if (!currentEditId) return;
        
        const p = projects.find(proj => proj.id === currentEditId);
        const extraD = parseInt(inputExtraDays.value) || 0;
        const extraB = parseFloat(inputExtraBudget.value) || 0;

        if (extraD > 0) {
            const currentDeadline = new Date(p.deadline);
            p.deadline = new Date(currentDeadline.getTime() + (extraD * 24 * 60 * 60 * 1000)).toISOString();
            p.days += extraD;
        }

        const currentGross = parseFloat(p.budgetGross) || 0;
        if (extraB > 0 || (extraB === 0 && currentGross === 0)) {
            p.budgetGross = currentGross + extraB;
            p.budgetNet = calculateNet(p.budgetGross, p.wFeeType || '20', p.manualPercent || '0', p.isDelegated);
        }

        saveAndRender();
        modal.classList.add('hidden');
        currentEditId = null;
    });

    window.deleteProject = (id) => {
        if (confirm('¿Proyecto entregado? Se moverá al histórico de ingresos.')) {
            const index = projects.findIndex(p => p.id === id);
            if (index > -1) {
                const finishedProject = projects[index];
                finishedProject.deliveredDate = new Date().toISOString();
                history.push(finishedProject);
                projects.splice(index, 1);
                
                localStorage.setItem('projectPulseHistory', JSON.stringify(history));
                saveAndRender();
            }
        }
    };

    window.removeProject = (id) => {
        if (confirm('¿Eliminar este proyecto por error? Se borrará por completo y NO se sumará al historial.')) {
            const index = projects.findIndex(p => p.id === id);
            if (index > -1) {
                projects.splice(index, 1);
                // localStorage.setItem('projectPulseData', JSON.stringify(projects));
                saveAndRender();
            }
        }
    };

    function saveAndRender() {
        projects.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        localStorage.setItem('projectPulseData', JSON.stringify(projects));
        renderProjects();
        renderDashboard();
    }

    // --- RENDERIZADO VISUAL ---
    function renderDashboard() {
        let actUSD = 0, actARS = 0;
        let mthUSD = 0, mthARS = 0;
        let totUSD = 0, totARS = 0;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        projects.forEach(p => {
            const net = p.budgetNet || 0;
            if (p.currency === 'ARS') actARS += net;
            else actUSD += net;
        });

        history.forEach(p => {
            const isARS = p.currency === 'ARS';
            const net = p.budgetNet || 0;
            
            // Histórico total
            if (isARS) totARS += net;
            else totUSD += net;

            // Mes actual
            if (p.deliveredDate) {
                const dDate = new Date(p.deliveredDate);
                if (dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear) {
                    if (isARS) mthARS += net;
                    else mthUSD += net;
                }
            }
        });

        const formatMoney = (val) => val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if(activeUSD) activeUSD.innerText = `USD ${formatMoney(actUSD)}`;
        if(activeARS) activeARS.innerText = `ARS ${formatMoney(actARS)}`;
        
        if(monthUSD) monthUSD.innerText = `USD ${formatMoney(mthUSD)}`;
        if(monthARS) monthARS.innerText = `ARS ${formatMoney(mthARS)}`;

        if(totalUSD) totalUSD.innerText = `USD ${formatMoney(totUSD)}`;
        if(totalARS) totalARS.innerText = `ARS ${formatMoney(totARS)}`;
    }

    function renderMonthlyHistory() {
        if (!monthlyHistoryList) return;
        monthlyHistoryList.innerHTML = '';
        
        if (history.length === 0) {
            monthlyHistoryList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">No hay proyectos finalizados aún.</p>';
            return;
        }

        const monthsData = {};

        history.forEach(p => {
            if (!p.deliveredDate) return;
            const dDate = new Date(p.deliveredDate);
            const monthKey = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthsData[monthKey]) {
                const monthName = dDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
                monthsData[monthKey] = {
                    label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                    usd: 0,
                    ars: 0,
                    count: 0
                };
            }
            
            const net = p.budgetNet || 0;
            if (p.currency === 'ARS') {
                monthsData[monthKey].ars += net;
            } else {
                monthsData[monthKey].usd += net;
            }
            monthsData[monthKey].count++;
        });

        const sortedKeys = Object.keys(monthsData).sort().reverse();
        const formatMoney = (val) => val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        sortedKeys.forEach(key => {
            const data = monthsData[key];
            const card = document.createElement('div');
            card.style.cssText = "background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px;";
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:5px;">
                    <strong style="color:var(--text); font-size:1rem;">${data.label}</strong>
                    <span class="badge" style="font-size:0.75rem; padding:2px 6px;">${data.count} proy.</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
                    <span style="color:var(--success); font-weight:bold;">USD ${formatMoney(data.usd)}</span>
                    <span style="color:var(--warning); font-weight:bold;">ARS ${formatMoney(data.ars)}</span>
                </div>
            `;
            monthlyHistoryList.appendChild(card);
        });
    }

    function renderProjects() {
        projectsList.innerHTML = '';
        activeCount.innerText = projects.length;
        const now = new Date();

        projects.forEach(p => {
            const deadline = new Date(p.deadline);
            const remainingMs = deadline - now;
            const totalMs = deadline - new Date(p.accepted);
            
            let progress = ((totalMs - remainingMs) / totalMs) * 100;
            progress = Math.max(0, Math.min(100, progress));
            
            let colorVar = "var(--success)";
            let countdownText = "";
            
            if (remainingMs <= 0) {
                countdownText = "ENTREGA PENDIENTE";
                colorVar = "var(--danger)";
            } else {
                const d = Math.floor(remainingMs / 86400000);
                const h = Math.floor((remainingMs % 86400000) / 3600000);
                countdownText = `Quedan ${d}d ${h}h`;
                
                const remainingPer = (remainingMs / totalMs) * 100;
                if (remainingPer <= 10) colorVar = "var(--danger)";
                else if (remainingPer <= 30) colorVar = "var(--accent)";
                else if (remainingPer <= 50) colorVar = "var(--warning)";
            }

            const card = document.createElement('div');
            card.className = 'card';
            
            const currSymbol = p.currency || 'USD';
            const delegatedBadge = p.isDelegated ? '<span class="badge" style="background:var(--warning); color:#000; font-size:0.7rem; margin-left:8px; vertical-align:middle; padding:3px 8px;">Delegado (30%)</span>' : '';
            
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div class="project-client" style="display:flex; align-items:center;">
                            ${p.client} ${delegatedBadge}
                        </div>
                        <div class="project-name">${p.project}</div>
                    </div>
                    <button onclick="removeProject('${p.id}')" title="Eliminar definitivamente" style="background:transparent; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer; padding:0 0 10px 10px; opacity:0.8;">🗑️</button>
                </div>
                
                <div class="finance-block">
                    <div class="gross-amount">Bruto: ${currSymbol} ${(p.budgetGross || 0).toFixed(2)}</div>
                    <div class="net-amount">Neto: ${currSymbol} ${(p.budgetNet || 0).toFixed(2)}</div>
                </div>

                <div class="project-dates">
                    <div class="date-block">
                        <span>Aceptado:</span>
                        <strong>${formatDate(p.accepted)}</strong>
                    </div>
                    <div class="date-block" style="text-align: right;">
                        <span>Límite (${p.days}d):</span>
                        <strong>${formatDate(p.deadline)}</strong>
                    </div>
                </div>

                <div class="progress-container">
                    <div class="progress-bar" style="width:${progress}%; background:${colorVar}"></div>
                </div>
                
                <div class="countdown" style="color:${colorVar}">${countdownText}</div>
                
                <div class="card-actions">
                    <button class="btn btn-edit half" onclick="openEditModal('${p.id}')">⚙️ Gestionar</button>
                    <button class="btn btn-delete half" onclick="deleteProject('${p.id}')">✔️ Entregado</button>
                </div>
            `;
            projectsList.appendChild(card);
        });
    }

    // --- SISTEMA DE BACKUP ---
    document.getElementById('btnExport').addEventListener('click', () => {
        const data = { 
            projectPulseData: localStorage.getItem('projectPulseData'),
            projectPulseHistory: localStorage.getItem('projectPulseHistory')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `ProjectPulse_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    document.getElementById('importFile').addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                let imported = false;
                if (data.projectPulseData !== undefined) {
                    localStorage.setItem('projectPulseData', data.projectPulseData);
                    imported = true;
                }
                if (data.projectPulseHistory !== undefined) {
                    localStorage.setItem('projectPulseHistory', data.projectPulseHistory);
                    imported = true;
                }
                if (imported) location.reload();
                else alert('El archivo no contiene datos válidos de ProjectPulse.');
            } catch (err) { alert('Backup inválido.'); }
        };
        reader.readAsText(e.target.files[0]);
    });

    setInterval(renderProjects, 60000);
    setDefaultDate();
    renderProjects();
    renderDashboard();
});