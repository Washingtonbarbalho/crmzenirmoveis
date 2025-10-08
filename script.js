document.addEventListener('DOMContentLoaded', () => {
    const clientForm = document.getElementById('client-form');
    const clientList = document.getElementById('client-list');
    const clientIdField = document.getElementById('client-id');
    const nameField = document.getElementById('name');
    const emailField = document.getElementById('email');
    const phoneField = document.getElementById('phone');
    const statusField = document.getElementById('status');
    const clearBtn = document.getElementById('clear-btn');
    const searchField = document.getElementById('search');

    // Para um app real, use um banco de dados. localStorage é para simplicidade.
    let clients = JSON.parse(localStorage.getItem('clients')) || [];

    const saveClients = () => {
        localStorage.setItem('clients', JSON.stringify(clients));
    };

    const renderClients = (filter = '') => {
        clientList.innerHTML = '';
        const filteredClients = clients.filter(client => 
            client.name.toLowerCase().includes(filter.toLowerCase())
        );

        if (filteredClients.length === 0) {
            clientList.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Nenhum cliente encontrado.</p>';
            return;
        }

        filteredClients.forEach(client => {
            const clientCard = document.createElement('div');
            clientCard.className = 'client-card';
            clientCard.dataset.id = client.id;

            let statusColor;
            switch (client.status) {
                case 'Lead': statusColor = '#3498db'; break;
                case 'Contato Realizado': statusColor = '#f1c40f'; break;
                case 'Proposta Enviada': statusColor = '#e67e22'; break;
                case 'Cliente': statusColor = '#2ecc71'; break;
                default: statusColor = '#95a5a6';
            }

            clientCard.innerHTML = `
                <div class="client-info">
                    <h3>${client.name}</h3>
                    <p><i class="fas fa-envelope"></i> ${client.email}</p>
                    <p><i class="fas fa-phone"></i> ${client.phone}</p>
                </div>
                <div class="client-controls">
                    <div class="client-status" style="background-color: ${statusColor};">${client.status}</div>
                    <div class="client-actions">
                        <button class="btn-edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
            clientList.appendChild(clientCard);
        });
    };

    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = clientIdField.value;
        const clientData = {
            name: nameField.value,
            email: emailField.value,
            phone: phoneField.value,
            status: statusField.value,
        };

        if (id) {
            // Atualizar
            clients = clients.map(client => client.id === id ? { ...client, ...clientData } : client);
        } else {
            // Criar
            clientData.id = Date.now().toString();
            clients.push(clientData);
        }

        saveClients();
        renderClients();
        resetForm();
    });

    const resetForm = () => {
        clientForm.reset();
        clientIdField.value = '';
    };

    clearBtn.addEventListener('click', resetForm);

    clientList.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit');
        const deleteBtn = e.target.closest('.btn-delete');
        
        if (editBtn) {
            const card = editBtn.closest('.client-card');
            const clientId = card.dataset.id;
            const client = clients.find(c => c.id === clientId);
            
            if (client) {
                clientIdField.value = client.id;
                nameField.value = client.name;
                emailField.value = client.email;
                phoneField.value = client.phone;
                statusField.value = client.status;
                nameField.focus();
            }
        }

        if (deleteBtn) {
            const card = deleteBtn.closest('.client-card');
            const clientId = card.dataset.id;
            
            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                clients = clients.filter(c => c.id !== clientId);
                saveClients();
                renderClients();
            }
        }
    });

    searchField.addEventListener('input', (e) => {
        renderClients(e.target.value);
    });

    // Renderização inicial
    renderClients();
});
