document.addEventListener("DOMContentLoaded", () => {
    
    // 1. DOM Elements
    const form = document.getElementById('projectForm');
    const inputClientName = document.getElementById('clientName');
    const inputProjectName = document.getElementById('projectName');
    const inputAcceptDate = document.getElementById('acceptDate');
    const inputDeliveryDays = document.getElementById('deliveryDays');
    
    const projectsList = document.getElementById('projectsList');
    const activeCount = document.getElementById('activeCount');
    
    const btnExport = document.getElementById('btnExport');
    const importFile = document.getElementById('importFile');

    // 2. Estado (Cargar de localStorage)
    let projects = JSON.parse(localStorage.getItem('projectPulseData')) || [];

    // Setear la fecha actual en el input por defecto (Hora local)
    function setDefaultDate() {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        inputAcceptDate.value = now.toISOString().slice(0, 16);
    }

    // ---------------- LÓGICA PRINCIPAL ---------------- //

    // Manejar envío del formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const acceptedDate = new Date(inputAcceptDate.value);
        const days = parseInt(inputDeliveryDays.value);
        
        // Calcular Deadline (Sumar ms de los días a la fecha de aceptación)
        const deadlineDate = new Date(acceptedDate.getTime() + (days * 24 * 60 * 60 * 1000));

        const newProject = {
            id: Date.now().toString(),
            client: inputClientName.value.trim(),
            project: inputProjectName.value.trim(),
            accepted: acceptedDate.toISOString(),
            days: days,
            deadline: deadlineDate.toISOString()
        };

        projects.push(newProject);
        saveAndRender();
        
        // Reset form pero manteniendo la fecha actual
        form.reset();
        setDefaultDate();
    });

    window.deleteProject = (id) => {
        if (confirm('¿Proyecto entregado/terminado? Se borrará de la lista activa.')) {
            projects = projects.filter(p => p.id !== id);
            saveAndRender();
        }
    };

    function saveAndRender() {
        // Ordenar por fecha de entrega más cercana primero
        projects.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        localStorage.setItem('projectPulseData', JSON.stringify(projects));
        renderProjects();
    }

    // ---------------- MOTOR DE RENDERIZADO Y CÁLCULO ---------------- //

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
            
            // Cálculos de tiempo
            const totalMs = deadline.getTime() - accepted.getTime();
            const remainingMs = deadline.getTime() - now.getTime();
            
            // Lógica de progreso
            let progressPercent = ((totalMs - remainingMs) / totalMs) * 100;
            if (progressPercent < 0) progressPercent = 0;
            if (progressPercent > 100) progressPercent = 100;
            
            let remainingPercent = (remainingMs / totalMs) * 100;
            
            // Formatear texto de Faltan X días / horas
            let countdownText = "";
            let colorVar = "var(--success)"; // Default Verde
            
            if (remainingMs <= 0) {
                countdownText = "¡TIEMPO AGOTADO!";
                colorVar = "var(--danger)";
            } else {
                const rDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
                const rHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                
                countdownText = `Faltan ${rDays}d ${rHours}h`;

                // Semáforo Adaptativo (Lógica de Arquitectura)
                if (remainingPercent <= 5) {
                    colorVar = "var(--danger)"; // Rojo: < 5% del tiempo total
                } else if (remainingPercent <= 20) {
                    colorVar = "var(--accent)"; // Naranja: < 20%
                } else if (remainingPercent <= 50) {
                    colorVar = "var(--warning)"; // Amarillo: < 50%
                }
            }

            // Crear Tarjeta
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="project-client">${p.client}</div>
                <div class="project-name">${p.project}</div>
                
                <div class="project-dates">
                    <div class="date-block">
                        <span>Aceptado:</span>
                        <strong>${formatDate(p.accepted)}</strong>
                    </div>
                    <div class="date-block" style="text-align: right;">
                        <span>Límite (${p.days} días):</span>
                        <strong>${formatDate(p.deadline)}</strong>
                    </div>
                </div>

                <div class="progress-container">
                    <div class="progress-bar" style="width: ${progressPercent}%; background-color: ${colorVar};"></div>
                </div>
                
                <div class="countdown" style="color: ${colorVar};">${countdownText}</div>
                
                <button class="btn btn-delete" onclick="deleteProject('${p.id}')">Marcar como Entregado</button>
            `;
            
            projectsList.appendChild(card);
        });
    }

    // Actualizar los contadores visuales cada minuto sin recargar la página
    setInterval(renderProjects, 60000); 

    // ---------------- BACKUP SYSTEM (JSON) ---------------- //

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

    // Arranque
    setDefaultDate();
    renderProjects();
});