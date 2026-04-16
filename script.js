document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Constantes Financieras
    const FIXED_FEE = 0.0732; // 7.32% (PayPal + Lemon, etc.)

    // 2. DOM Elements - Formulario
    const form = document.getElementById('projectForm');
    const inputClientName = document.getElementById('clientName');
    const inputProjectName = document.getElementById('projectName');
    const inputAcceptDate = document.getElementById('acceptDate');
    const inputDeliveryDays = document.getElementById('deliveryDays');
    const inputBudgetGross = document.getElementById('budgetGross');
    const inputWorkanaFee = document.getElementById('workanaFee');
    
    const projectsList = document.getElementById('projectsList');
    const activeCount = document.getElementById('activeCount');
    
    // Backup
    const btnExport = document.getElementById('btnExport');
    const importFile = document.getElementById('importFile');

    // Modal
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const inputExtraDays = document.getElementById('extraDays');
    const inputExtraBudget = document.getElementById('extraBudget');
    const btnModalCancel = document.getElementById('modal-cancel');
    const btnModalSave = document.getElementById('modal-save');
    
    let currentEditId = null;

    // 3. Estado
    let projects = JSON.parse(localStorage.getItem('projectPulseData')) || [];

    function setDefaultDate() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        inputAcceptDate.value = now.toISOString().slice(0, 16);
    }

    // ---------------- MOTOR FINANCIERO ---------------- //

    function calculateNet(gross, workanaFeePercent) {
        const afterWorkana = gross * (1 - (workanaFeePercent / 100));
        const finalNet = afterWorkana * (1 - FIXED_FEE);
        return parseFloat(finalNet.toFixed(2));
    }

    // ---------------- LÓGICA PRINCIPAL ---------------- //

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const acceptedDate = new Date(inputAcceptDate.value);
        const days = parseInt(inputDeliveryDays.value);
        const gross = parseFloat(inputBudgetGross.value);
        const wFee = parseInt(inputWorkanaFee.value);
        
        // Calcular Deadline
        const deadlineDate = new Date(acceptedDate.getTime() + (days * 24 * 60 * 60 * 1000));

        const newProject = {
            id: Date.now().toString(),
            client: inputClientName.value.trim(),
            project: inputProjectName.value.trim(),
            accepted: acceptedDate.toISOString(),
            days: days,
            deadline: deadlineDate.toISOString(),
            budgetGross: gross,
            workanaFee: wFee,
            budgetNet: calculateNet(gross, wFee)
        };

        projects.push(newProject);
        saveAndRender();
        
        form.reset();
        setDefaultDate();
    });

    window.deleteProject = (id) => {
        if (confirm('¿Proyecto entregado? Se eliminará de la lista activa.')) {
            projects = projects.filter(p => p.id !== id);
            saveAndRender();
        }
    };

    function saveAndRender() {
        projects.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        localStorage.setItem('projectPulseData', JSON.stringify(projects));
        renderProjects();
    }

    // ---------------- GESTIÓN DE EXTENSIONES (MODAL) ---------------- //

    window.openEditModal = (id) => {
        currentEditId = id;
        const p = projects.find(proj => proj.id === id);
        modalTitle.innerText = `Editar: ${p.client}`;
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

        if (extraB > 0) {
            p.budgetGross += extraB;
            // Se asume que el presupuesto extra mantiene la misma comisión de Workana del proyecto base
            p.budgetNet = calculateNet(p.budgetGross, p.workanaFee);
        }

        saveAndRender();
        modal.classList.add('hidden');
        currentEditId = null;
    });

    // ---------------- RENDERIZADO VISUAL ---------------- //

    function formatDate(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });
    }

    function renderProjects() {
        projectsList.innerHTML = '';
        activeCount.innerText = projects.length;

        if (projects.length === 0) {
            projectsList.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Sin proyectos activos.</p>';
            return;
        }

        const now = new Date();

        projects.forEach(p => {
            const accepted = new Date(p.accepted);
            const deadline = new Date(p.deadline);
            
            const totalMs = deadline.getTime() - accepted.getTime();
            const remainingMs = deadline.getTime() - now.getTime();
            
            let progressPercent = ((totalMs - remainingMs) / totalMs) * 100;
            if (progressPercent < 0) progressPercent = 0;
            if (progressPercent > 100) progressPercent = 100;
            
            let remainingPercent = (remainingMs / totalMs) * 100;
            
            let countdownText = "";
            let colorVar = "var(--success)"; 
            
            if (remainingMs <= 0) {
                countdownText = "¡TIEMPO AGOTADO!";
                colorVar = "var(--danger)";
            } else {
                const rDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
                const rHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                countdownText = `Faltan ${rDays}d ${rHours}h`;

                if (remainingPercent <= 5) colorVar = "var(--danger)"; 
                else if (remainingPercent <= 20) colorVar = "var(--accent)"; 
                else if (remainingPercent <= 50) colorVar = "var(--warning)"; 
            }

            // Manejar compatibilidad con V1.0 (si no tenían presupuesto)
            const gross = p.budgetGross ? p.budgetGross.toFixed(2) : "0.00";
            const net = p.budgetNet ? p.budgetNet.toFixed(2) : "0.00";

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="project-client">${p.client}</div>
                <div class="project-name">${p.project}</div>
                
                <div class="finance-block">
                    <div class="gross-amount">Bruto: USD ${gross}</div>
                    <div class="net-amount">Neto: USD ${net}</div>
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
                    <div class="progress-bar" style="width: ${progressPercent}%; background-color: ${colorVar};"></div>
                </div>
                
                <div class="countdown" style="color: ${colorVar};">${countdownText}</div>
                
                <div class="card-actions">
                    <button class="btn btn-edit" onclick="openEditModal('${p.id}')">⚙️ Modificar</button>
                    <button class="btn btn-delete" onclick="deleteProject('${p.id}')">Entregado</button>
                </div>
            `;
            
            projectsList.appendChild(card);
        });
    }

    setInterval(renderProjects, 60000); 

    // ---------------- BACKUP SYSTEM ---------------- //

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const data = { projectPulseData: localStorage.getItem('projectPulseData') };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `ProjectPulse_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        });
    }

    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.projectPulseData) {
                        localStorage.setItem('projectPulseData', data.projectPulseData);
                        projects = JSON.parse(data.projectPulseData);
                        saveAndRender();
                        alert('Backup restaurado correctamente.');
                    }
                } catch (err) { alert('Archivo inválido.'); }
            };
            reader.readAsText(file);
        });
    }

    setDefaultDate();
    renderProjects();
});