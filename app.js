import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, where, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ATENÇÃO: Mantenha suas chaves do Firebase seguras.
// Para um projeto profissional, considere usar variáveis de ambiente.
const firebaseConfig = {
    apiKey: "AIzaSyB2lylkLmSLkO55rcX7FVQh3UBPEL9Vc58",
    authDomain: "crm-zenir-moveis.firebaseapp.com",
    projectId: "crm-zenir-moveis",
    storageBucket: "crm-zenir-moveis.appspot.com",
    messagingSenderId: "840752930737",
    appId: "1:840752930737:web:e4b8c2972fb62e5df9a790"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- FUNÇÕES UTILITÁRIAS ---
const getFortalezaDate = () => new Date();
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};
const getYYYYMMDD = (date = new Date()) => {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Fortaleza'
    }).format(date);
};
const maskPhone = (event) => {
    let value = event.target.value.replace(/\D/g, '').slice(0, 11);
    value = value.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    event.target.value = value;
};
 const maskPV = (event) => {
    let value = event.target.value.replace(/[^0-9]/g, '');
    value = value.slice(0, 11);
    if (value.length > 9) { value = `PV-${value.slice(0,9)}-${value.slice(9)}`; } 
    else if (value.length > 0) { value = `PV-${value}`; }
    event.target.value = value.toUpperCase();
};

// --- MÓDulos da Aplicação ---
const appManager = {
    uiManager: {
        body: document.body,
        sidebar: document.getElementById('sidebar'),
        menuButton: document.getElementById('menu-button'),
        overlay: document.getElementById('overlay'),
        allCancelButtons: document.querySelectorAll('.cancel-btn'),
        allModals: document.querySelectorAll('.fixed.inset-0[id$="-modal"]'),
        pageTitle: document.getElementById('page-title'),
        loadingSpinner: document.getElementById('loading-spinner'),
        userDisplayName: document.getElementById('user-display-name'),
        init() {
            this.menuButton.addEventListener('click', () => {
                 this.sidebar.classList.toggle('open'); this.overlay.classList.toggle('hidden');
            });
            this.overlay.addEventListener('click', () => {
                 this.sidebar.classList.remove('open'); this.overlay.classList.add('hidden');
            });
            this.allCancelButtons.forEach(btn => btn.addEventListener('click', () => {
                this.allModals.forEach(modal => modal.classList.add('hidden'));
                this.body.classList.remove('modal-open');
            }));
             document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', e => {
                e.preventDefault(); this.showPage(l.dataset.page);
            }));
        },
        showPage(pageId) {
            document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
            document.getElementById(`${pageId}-page`).classList.remove('hidden');
            const titles = { leads: 'Gerenciamento de Leads', 'pos-venda': 'Gerenciamento Pós-venda', sac: 'Gerenciamento SAC', users: 'Gerenciamento de Usuários' };
            this.pageTitle.textContent = titles[pageId] || 'CRM Zenir';
            document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('bg-zenir-blue-dark', l.dataset.page === pageId));
            localStorage.setItem('lastVisitedPage', pageId); // Salva a página atual
            this.sidebar.classList.remove('open');
            this.overlay.classList.add('hidden');
            this.body.classList.remove('modal-open');
        },
        showLoading(show) {
            this.loadingSpinner.style.display = show ? 'flex' : 'none';
        }
    },

    deleteModalManager: {
        modal: document.getElementById('delete-confirmation-modal'),
        confirmBtn: document.getElementById('confirm-delete-btn'),
        cancelBtn: document.getElementById('cancel-delete-btn'),
        init() {
            this.confirmBtn.addEventListener('click', async () => {
                if (appManager.leadsManager.state.docToDelete) { await deleteDoc(doc(db, 'leads', appManager.leadsManager.state.docToDelete)); appManager.leadsManager.state.docToDelete = null; }
                if (appManager.posVendaManager.state.docToDelete) { await deleteDoc(doc(db, 'pos_venda', appManager.posVendaManager.state.docToDelete)); appManager.posVendaManager.state.docToDelete = null; }
                if (appManager.sacManager.state.docToDelete) { await deleteDoc(doc(db, 'sac_occurrences', appManager.sacManager.state.docToDelete)); appManager.sacManager.state.docToDelete = null; }
                if (appManager.usersManager.state.docToDelete) { await deleteDoc(doc(db, 'users', appManager.usersManager.state.docToDelete)); appManager.usersManager.state.docToDelete = null; }
                this.modal.classList.add('hidden');
                appManager.uiManager.body.classList.remove('modal-open');
            });
            this.cancelBtn.addEventListener('click', () => {
                this.modal.classList.add('hidden');
                appManager.uiManager.body.classList.remove('modal-open');
            });
        },
        show() { this.modal.classList.remove('hidden'); appManager.uiManager.body.classList.add('modal-open'); }
    },
    
    authManager: {
        authContainer: document.getElementById('auth-container'),
        appContent: document.getElementById('app-content'),
        loginPage: document.getElementById('login-page'),
        registerPage: document.getElementById('register-page'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        goToRegisterBtn: document.getElementById('go-to-register'),
        goToLoginBtn: document.getElementById('go-to-login'),
        logoutBtn: document.getElementById('logout-btn'),
        loginError: document.getElementById('login-error'),
        registerError: document.getElementById('register-error'),
        
        init() {
            this.attachEventListeners();
            this.listenForAuthState();
        },
        
        attachEventListeners() {
            this.goToRegisterBtn.addEventListener('click', (e) => { e.preventDefault(); this.showRegister(); });
            this.goToLoginBtn.addEventListener('click', (e) => { e.preventDefault(); this.showLogin(); });
            this.loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); });
            this.registerForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleRegister(); });
            this.logoutBtn.addEventListener('click', () => {
                appManager.uiManager.showLoading(true);
                localStorage.removeItem('lastVisitedPage');
                signOut(auth);
            });

            const togglePassword = (input, icon) => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            };

            const togglePassIcon = document.getElementById('toggle-password');
            const passwordInput = document.getElementById('register-password');
            togglePassIcon.addEventListener('click', () => togglePassword(passwordInput, togglePassIcon));

            const toggleConfirmPassIcon = document.getElementById('toggle-confirm-password');
            const confirmPasswordInput = document.getElementById('register-confirm-password');
            toggleConfirmPassIcon.addEventListener('click', () => togglePassword(confirmPasswordInput, toggleConfirmPassIcon));

            document.getElementById('register-name').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
            document.getElementById('register-filial').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
            document.getElementById('register-phone').addEventListener('input', maskPhone);
        },

        showLogin() { this.loginPage.classList.remove('hidden'); this.registerPage.classList.add('hidden'); },
        showRegister() { this.registerPage.classList.remove('hidden'); this.loginPage.classList.add('hidden'); },

        handleLogin() {
            appManager.uiManager.showLoading(true);
            this.loginError.classList.add('hidden');
            const email = this.loginForm['login-email'].value;
            const password = this.loginForm['login-password'].value;
            sessionStorage.setItem('isNewLogin', 'true');
            signInWithEmailAndPassword(auth, email, password).catch(error => {
                this.loginError.textContent = "Email ou senha inválidos.";
                this.loginError.classList.remove('hidden');
                appManager.uiManager.showLoading(false);
                sessionStorage.removeItem('isNewLogin');
            });
        },
        handleRegister() {
            const name = this.registerForm['register-name'].value;
            const preferredName = this.registerForm['register-preferred-name'].value.toUpperCase();
            const phone = this.registerForm['register-phone'].value;
            const filial = this.registerForm['register-filial'].value;
            const email = this.registerForm['register-email'].value;
            const password = this.registerForm['register-password'].value;
            const confirmPassword = this.registerForm['register-confirm-password'].value;

            if (password !== confirmPassword) { this.registerError.textContent = "As senhas não coincidem."; this.registerError.classList.remove('hidden'); return; }

            const isAdmin = email === 'washington.wn8@gmail.com';
            createUserWithEmailAndPassword(auth, email, password)
                .then(userCredential => {
                    const user = userCredential.user;
                    setDoc(doc(db, 'users', user.uid), {
                        name, preferredName, phone, filial, email,
                        role: isAdmin ? 'admin' : 'user',
                        status: isAdmin ? 'Aprovado' : 'Pendente'
                    }).then(() => {
                        alert(isAdmin ? 'Conta de administrador criada com sucesso!' : 'Cadastro realizado! Aguarde a aprovação do administrador.');
                        signOut(auth);
                        this.showLogin();
                    });
                })
                .catch(error => {
                    this.registerError.textContent = "Erro ao cadastrar. Verifique o email.";
                    this.registerError.classList.remove('hidden');
                });
        },
        listenForAuthState() {
             onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        if (userData.status === 'Aprovado') {
                            this.authContainer.style.display = 'none';
                            this.appContent.style.display = 'flex';
                            
                            appManager.uiManager.userDisplayName.textContent = `Olá, ${userData.preferredName || userData.name.split(' ')[0]}!`;
                            document.getElementById('nav-users-link').classList.toggle('hidden', userData.role !== 'admin');

                            appManager.uiManager.init();
                            appManager.deleteModalManager.init();
                            appManager.leadsManager.init(user, userData);
                            appManager.posVendaManager.init(user, userData);
                            appManager.sacManager.init(user, userData);
                            appManager.usersManager.init(user);
                            
                            const isNewLogin = sessionStorage.getItem('isNewLogin') === 'true';
                            if (isNewLogin) {
                                appManager.uiManager.showPage('leads');
                                sessionStorage.removeItem('isNewLogin');
                            } else {
                                const lastPage = localStorage.getItem('lastVisitedPage') || 'leads';
                                appManager.uiManager.showPage(lastPage);
                            }

                        } else {
                            this.loginError.textContent = userData.status === 'Pendente' ? 'Seu cadastro está pendente de aprovação pelo administrador.' : 'Seu acesso foi bloqueado.';
                            this.loginError.classList.remove('hidden');
                            signOut(auth); 
                        }
                    } else { signOut(auth); }
                } else {
                    if(this.appContent.style.display === 'flex') window.location.reload();
                    this.authContainer.style.display = 'flex';
                    this.showLogin();
                }
                 appManager.uiManager.showLoading(false);
            });
        }
    },

    leadsManager: {
        state: { all: [], filter: 'Em Andamento', docToDelete: null, currentPage: 1, itemsPerPage: 6, currentUser: null, currentUserData: null },
        ui: {
            list: document.getElementById('leads-list'),
            tabsContainer: document.getElementById('leads-tabs-container'),
            pagination: document.getElementById('leads-pagination'),
            addModal: document.getElementById('add-lead-modal'),
            editModal: document.getElementById('edit-lead-modal'),
            addForm: document.getElementById('add-lead-form'),
            editForm: document.getElementById('edit-lead-form'),
            openAddBtn: document.getElementById('open-add-lead-modal-btn'),
        },
        colors: {
            final: {'Venda Realizada': 'bg-green-100 text-green-800', 'Não Interessado': 'bg-red-100 text-red-800'},
            estagio: {'Contato 1': 'bg-blue-100 text-blue-800', 'Contato 2': 'bg-cyan-100 text-cyan-800', 'Contato 3': 'bg-purple-100 text-purple-800', 'Contato 4': 'bg-orange-100 text-orange-800'}
        },
        init(user, userData) { this.state.currentUser = user; this.state.currentUserData = userData; this.attachEventListeners(); this.listenForChanges(); },
        attachEventListeners() {
            this.ui.openAddBtn.addEventListener('click', () => {
                this.ui.addForm.reset();
                const nextBusinessDay = new Date();
                nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
                if ([6,0].includes(nextBusinessDay.getDay())) {
                    nextBusinessDay.setDate(nextBusinessDay.getDate() + (nextBusinessDay.getDay() === 6 ? 2 : 1));
                }
                this.ui.addForm['data-visita'].value = getYYYYMMDD();
                this.ui.addForm['proximo-contato'].value = getYYYYMMDD(nextBusinessDay);
                this.ui.addModal.classList.remove('hidden');
                appManager.uiManager.body.classList.add('modal-open');
            });
            this.ui.addForm.addEventListener('submit', (e) => this.handleFormSubmit(e, 'add'));
            this.ui.editForm.addEventListener('submit', (e) => this.handleFormSubmit(e, 'edit'));
            this.ui.addForm.contato.addEventListener('input', maskPhone);
            this.ui.editForm['edit-contato'].addEventListener('input', maskPhone);
            this.ui.list.addEventListener('click', (e) => this.handleCardClick(e));
            this.ui.tabsContainer.addEventListener('click', (e) => {
                const targetTab = e.target.closest('.tab-leads');
                if(targetTab) { this.state.filter = targetTab.dataset.filter; this.state.currentPage = 1; this.filterAndRender(); }
            });
             this.ui.pagination.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (button && button.dataset.page) { this.state.currentPage = parseInt(button.dataset.page); this.filterAndRender(); }
            });
            this.ui.editForm['edit-status-final'].addEventListener('change', (e) => {
                 const isFinal = e.target.value !== 'Em Andamento';
                 this.ui.editForm['edit-estagio-contato'].disabled = isFinal;
                 this.ui.editForm['edit-proximo-contato'].disabled = isFinal;
            });
            this.ui.editForm['edit-estagio-contato'].addEventListener('change', (e) => {
                const daysMap = {'Contato 2': 5, 'Contato 3': 10, 'Contato 4': 10};
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + (daysMap[e.target.value] || 1));
                 if ([6,0].includes(nextDate.getDay())) {
                    nextDate.setDate(nextDate.getDate() + (nextDate.getDay() === 6 ? 2 : 1));
                }
                this.ui.editForm['edit-proximo-contato'].value = getYYYYMMDD(nextDate);
            });
        },
        listenForChanges() {
            const q = query(collection(db, 'leads'), where("userId", "==", this.state.currentUser.uid));
            onSnapshot(q, (snapshot) => {
                this.state.all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.filterAndRender();
            });
        },
        filterAndRender() {
            let filtered = this.state.all;

            // 1. Filtrar com base na aba selecionada
            if (this.state.filter !== 'Visão Geral') {
                filtered = this.state.all.filter(l => l.statusFinal === this.state.filter);
            }

            // 2. Aplicar a organização (sort)
            const statusPriority = { 'Em Andamento': 1, 'Venda Realizada': 2, 'Não Interessado': 3 };

            filtered.sort((a, b) => {
                // Lógica para a aba "Visão Geral"
                if (this.state.filter === 'Visão Geral') {
                    const priorityA = statusPriority[a.statusFinal] || 4;
                    const priorityB = statusPriority[b.statusFinal] || 4;
                    // Primeiro, agrupa por status
                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }
                }
                // Para todos os casos (dentro dos grupos ou em outras abas), organiza por data de retorno
                const dateA = a.proximoContato || '9999-12-31';
                const dateB = b.proximoContato || '9999-12-31';
                return dateA.localeCompare(dateB);
            });
            
            this.render(filtered);
            this.updateTabCounts();
            this.updateTabStyles();
        },
        render(leadsToRender) {
            this.ui.list.innerHTML = ''; this.ui.pagination.innerHTML = '';
            if (leadsToRender.length === 0) { this.ui.list.innerHTML = `<p class="text-gray-500 col-span-full text-center mt-8">Nenhum lead encontrado.</p>`; return; }
            const paginatedItems = leadsToRender.slice((this.state.currentPage - 1) * this.state.itemsPerPage, this.state.currentPage * this.state.itemsPerPage);
            paginatedItems.forEach(lead => {
                const isFinal = lead.statusFinal !== 'Em Andamento';
                const statusText = isFinal ? lead.statusFinal : lead.estagioContato;
                const statusColor = isFinal ? this.colors.final[statusText] : this.colors.estagio[statusText];
                const whatsappBtn = !isFinal ? `<button data-action="whatsapp" class="text-green-500 hover:opacity-75"><i class="fab fa-whatsapp fa-lg"></i></button>` : '';
                const card = document.createElement('div');
                card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col justify-between gap-4 fade-in';
                card.dataset.id = lead.id;
                card.innerHTML = `<div><div class="flex justify-between items-start mb-2"><h3 class="text-xl font-bold text-gray-800">${lead.nome}</h3><span class="text-xs font-semibold px-2 py-1 rounded-full ${statusColor}">${statusText}</span></div><p class="text-sm text-gray-600 mb-3"><i class="fas fa-phone-alt text-gray-400 mr-2"></i>${lead.contato}</p><div class="bg-gray-50 p-3 rounded-md text-sm space-y-1"><p><strong class="font-semibold text-gray-700">Interesse:</strong> <span class="font-normal">${lead.produto}</span></p><p><strong class="font-semibold text-gray-700">Objeção:</strong> <span class="font-normal">${lead.motivo || 'N/A'}</span></p><p><strong class="font-semibold text-gray-700">Proposta:</strong> <span class="font-normal">${lead.proposta || 'N/A'}</span></p>${lead.observacao ? `<p><strong class="font-semibold text-gray-700">Observação:</strong> <span class="font-normal">${lead.observacao}</span></p>` : ''}</div></div><div class="border-t pt-3 flex justify-between items-center"><div class="text-sm"><span class="font-semibold text-gray-700">Retornar em:</span><p class="font-bold ${isFinal ? 'text-gray-400 line-through' : 'text-zenir-red'}">${formatDate(lead.proximoContato)}</p></div><div class="flex gap-3">${whatsappBtn}<button data-action="edit" class="text-zenir-blue hover:opacity-75"><i class="fas fa-edit fa-lg"></i></button><button data-action="delete" class="text-zenir-red hover:opacity-75"><i class="fas fa-trash-alt fa-lg"></i></button></div></div>`;
                this.ui.list.appendChild(card);
            });
            this.renderPagination(leadsToRender.length);
        },
        renderPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
            if (totalPages <= 1) return;
            let paginationHTML = '';
            paginationHTML += `<button data-page="${this.state.currentPage - 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
            for (let i = 1; i <= totalPages; i++) { paginationHTML += `<button data-page="${i}" class="px-3 py-1 rounded-md ${this.state.currentPage === i ? 'bg-zenir-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}">${i}</button>`; }
            paginationHTML += `<button data-page="${this.state.currentPage + 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === totalPages ? 'disabled' : ''}>Próximo</button>`;
            this.ui.pagination.innerHTML = paginationHTML;
        },
        updateTabCounts() {
            const counts = { 'Visão Geral': this.state.all.length, 'Em Andamento': this.state.all.filter(l => l.statusFinal === 'Em Andamento').length, 'Venda Realizada': this.state.all.filter(l => l.statusFinal === 'Venda Realizada').length, 'Não Interessado': this.state.all.filter(l => l.statusFinal === 'Não Interessado').length };
            this.ui.tabsContainer.innerHTML = Object.keys(counts).map(filter => `<button data-filter="${filter}" class="tab-leads whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-sm flex items-center rounded-t-lg transition-colors duration-200"><span class="count-badge mr-2 bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">${counts[filter]}</span>${filter}</button>`).join('');
        },
        updateTabStyles() {
            this.ui.tabsContainer.querySelectorAll('.tab-leads').forEach(tab => {
                const isActive = tab.dataset.filter === this.state.filter;
                tab.classList.toggle('border-zenir-blue', isActive); 
                tab.classList.toggle('text-zenir-blue', isActive);
                tab.classList.toggle('font-semibold', isActive);
                tab.classList.toggle('bg-blue-50', isActive);
                
                tab.classList.toggle('border-transparent', !isActive); 
                tab.classList.toggle('text-gray-500', !isActive);
                tab.classList.toggle('hover:text-zenir-blue', !isActive);
            });
        },
        async handleFormSubmit(event, type) {
            event.preventDefault();
            const form = type === 'add' ? this.ui.addForm : this.ui.editForm;
            const modal = type === 'add' ? this.ui.addModal : this.ui.editModal;
            const leadData = {
                nome: form.elements[type === 'add' ? 'nome' : 'edit-nome'].value.toUpperCase(),
                contato: form.elements[type === 'add' ? 'contato' : 'edit-contato'].value,
                produto: form.elements[type === 'add' ? 'produto' : 'edit-produto'].value.toUpperCase(),
                motivo: form.elements[type === 'add' ? 'motivo' : 'edit-motivo'].value.toUpperCase(),
                proposta: form.elements[type === 'add' ? 'proposta' : 'edit-proposta'].value.toUpperCase(),
                proximoContato: form.elements[type === 'add' ? 'proximo-contato' : 'edit-proximo-contato'].value,
                estagioContato: form.elements[type === 'add' ? 'estagio-contato' : 'edit-estagio-contato'].value,
                statusFinal: type === 'add' ? 'Em Andamento' : form.elements['edit-status-final'].value,
                observacao: form.elements[type === 'add' ? 'observacao' : 'edit-observacao'].value.toUpperCase(),
                dataUltimaAlteracao: getYYYYMMDD(),
                userId: this.state.currentUser.uid,
            };
            if (type === 'add') { leadData.dataVisita = form.elements['data-visita'].value; await addDoc(collection(db, 'leads'), leadData); } 
            else { const leadId = form.elements['edit-lead-id'].value; await updateDoc(doc(db, 'leads', leadId), leadData); }
            modal.classList.add('hidden');
            appManager.uiManager.body.classList.remove('modal-open');
        },
        handleCardClick(event) {
            const button = event.target.closest('button');
            if (!button) return;
            const card = button.closest('[data-id]');
            const leadId = card.dataset.id;
            const leadData = this.state.all.find(l => l.id === leadId);
            switch(button.dataset.action) {
                case 'delete': this.state.docToDelete = leadId; appManager.deleteModalManager.show(); break;
                case 'edit': this.populateEditForm(leadData); break;
                case 'whatsapp':
                    const message = this.getMessageForStage(leadData.estagioContato, leadData.nome, leadData.produto, this.state.currentUserData.preferredName);
                    const cleanPhone = '55' + leadData.contato.replace(/\D/g, '');
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                    break;
            }
        },
        populateEditForm(data) {
            const f = this.ui.editForm;
            f['edit-lead-id'].value = data.id; f['edit-nome'].value = data.nome; f['edit-contato'].value = data.contato; f['edit-produto'].value = data.produto;
            f['edit-motivo'].value = data.motivo; f['edit-proposta'].value = data.proposta; f['edit-proximo-contato'].value = data.proximoContato;
            f['edit-estagio-contato'].value = data.estagioContato; f['edit-status-final'].value = data.statusFinal;
            f['edit-observacao'].value = data.observacao || '';
            const isFinal = data.statusFinal !== 'Em Andamento';
            f['edit-estagio-contato'].disabled = isFinal; f['edit-proximo-contato'].disabled = isFinal;
            this.ui.editModal.classList.remove('hidden');
            appManager.uiManager.body.classList.add('modal-open');
        },
        getMessageForStage(stage, clientName, productName, salesPersonName) {
            const nomeCliente = clientName.split(' ')[0];
            const salesPersonTitle = `${salesPersonName}, Vendedor(a) da Zenir Móveis`;
            const messages = {
                'Contato 1': `Olá, ${nomeCliente}! Tudo bem? 😊 Sou ${salesPersonTitle}, e lembrei do seu interesse no produto *${productName}*. Ficou alguma dúvida que eu possa te ajudar a esclarecer? Estou aqui para isso!`,
                'Contato 2': `Oi, ${nomeCliente}! Sou ${salesPersonTitle}, e estou passando para saber se você já tomou uma decisão sobre o *${productName}*. Muitas pessoas têm procurado por ele, e eu não gostaria que você perdesse a oportunidade. Posso ajudar em algo mais?`,
                'Contato 3': `Olá, ${nomeCliente}! Como vai? Aqui é ${salesPersonTitle}. Notei que ainda não conversamos sobre o *${productName}*. Aconteceu algo ou a proposta não era bem o que você esperava? Seu feedback é super importante para mim!`,
                'Contato 4': `Olá, ${nomeCliente}! Aqui é ${salesPersonTitle}, com uma novidade exclusiva para você! ✨ Consegui uma condição especial e imperdível para você levar para casa o *${productName}*. É a sua chance! Vamos conversar?`,
            };
            return messages[stage] || `Olá ${nomeCliente}!`;
        }
    },
    
    posVendaManager: {
        state: { all: [], filter: 'Visão Geral', docToDelete: null, currentPage: 1, itemsPerPage: 6, currentUser: null, currentUserData: null },
        ui: {
            list: document.getElementById('pos-venda-list'),
            tabsContainer: document.getElementById('pos-venda-tabs-container'),
            pagination: document.getElementById('pos-venda-pagination'),
            addModal: document.getElementById('add-pos-venda-modal'),
            editModal: document.getElementById('edit-pos-venda-modal'),
            addForm: document.getElementById('add-pos-venda-form'),
            editForm: document.getElementById('edit-pos-venda-form'),
            openAddBtn: document.getElementById('open-add-pos-venda-modal-btn'),
        },
        colors: {'Aguardando Entrega': 'bg-yellow-100 text-yellow-800', 'Aguardando Montagem': 'bg-blue-100 text-blue-800', 'Concluído': 'bg-green-100 text-green-800'},
        init(user, userData) { this.state.currentUser = user; this.state.currentUserData = userData; this.attachEventListeners(); this.listenForChanges(); },
        attachEventListeners() {
            this.ui.openAddBtn.addEventListener('click', () => {
                this.ui.addForm.reset();
                this.ui.addForm.querySelector('#pv-montagem-container').classList.add('hidden');
                this.ui.addForm['pv-data-compra'].value = getYYYYMMDD();
                // Reset logistics to default (Entrega)
                this.ui.addForm.querySelector('#pv-logistica-entrega').checked = true;
                this.ui.addForm.querySelector('#pv-entrega-container').classList.remove('hidden');
                this.ui.addForm.querySelector('#pv-retirada-container').classList.add('hidden');
                this.ui.addForm.querySelector('#pv-previsao-entrega').required = true;
                this.ui.addForm.querySelector('#pv-data-retirada').required = false;

                this.ui.addModal.classList.remove('hidden');
                appManager.uiManager.body.classList.add('modal-open');
            });

            this.ui.addForm.addEventListener('submit', (e) => this.handleFormSubmit(e, 'add'));
            this.ui.editForm.addEventListener('submit', (e) => this.handleFormSubmit(e, 'edit'));
            
            this.ui.addForm['pv-contato'].addEventListener('input', maskPhone);
            this.ui.editForm['edit-pv-contato'].addEventListener('input', maskPhone);
            this.ui.addForm['pv-pv'].addEventListener('input', maskPV);
            this.ui.editForm['edit-pv-pv'].addEventListener('input', maskPV);

            this.ui.list.addEventListener('click', (e) => this.handleCardClick(e));
            this.ui.tabsContainer.addEventListener('click', (e) => {
                const targetTab = e.target.closest('.tab-pos-venda');
                if(targetTab) { this.state.filter = targetTab.dataset.filter; this.state.currentPage = 1; this.filterAndRender(); }
            });
            this.ui.pagination.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (button && button.dataset.page) { this.state.currentPage = parseInt(button.dataset.page); this.filterAndRender(); }
            });

            this.ui.addForm['pv-precisa-montagem'].addEventListener('change', (e) => { this.ui.addForm.querySelector('#pv-montagem-container').classList.toggle('hidden', !e.target.checked); });
            this.ui.editForm['edit-pv-precisa-montagem'].addEventListener('change', (e) => { this.ui.editForm.querySelector('#edit-pv-montagem-container').classList.toggle('hidden', !e.target.checked); });

            // Logistics Radio Button Logic
            const setupLogisticsToggle = (form, prefix) => {
                form.querySelectorAll(`input[name="${prefix}-logistica"]`).forEach(radio => {
                    radio.addEventListener('change', (e) => {
                        const isEntrega = e.target.value === 'Entrega';
                        form.querySelector(`#${prefix}-entrega-container`).classList.toggle('hidden', !isEntrega);
                        form.querySelector(`#${prefix}-retirada-container`).classList.toggle('hidden', isEntrega);
                        form.querySelector(`#${prefix}-previsao-entrega`).required = isEntrega;
                        form.querySelector(`#${prefix}-data-retirada`).required = !isEntrega;
                    });
                });
            };
            setupLogisticsToggle(this.ui.addForm, 'pv');
            setupLogisticsToggle(this.ui.editForm, 'edit-pv');
        },
        listenForChanges() {
            const q = query(collection(db, 'pos_venda'), where("userId", "==", this.state.currentUser.uid));
            onSnapshot(q, (snapshot) => {
                this.state.all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.filterAndRender();
            });
        },
        filterAndRender() {
            let filtered = this.state.all;

            if (this.state.filter !== 'Visão Geral') {
                filtered = this.state.all.filter(pv => pv.status === this.state.filter);
            }

            const statusPriority = { 'Aguardando Entrega': 1, 'Aguardando Montagem': 2, 'Concluído': 3 };

            filtered.sort((a, b) => {
                if (this.state.filter === 'Visão Geral') {
                    const priorityA = statusPriority[a.status] || 4;
                    const priorityB = statusPriority[b.status] || 4;
                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }
                }
                
                if (this.state.filter === 'Aguardando Montagem') {
                    const dateA = a.previsaoMontagem || '9999-12-31';
                    const dateB = b.previsaoMontagem || '9999-12-31';
                    return dateA.localeCompare(dateB);
                }

                const dateA = a.tipoLogistica === 'Retirada' ? a.dataRetirada : a.previsaoEntrega || '9999-12-31';
                const dateB = b.tipoLogistica === 'Retirada' ? b.dataRetirada : b.previsaoEntrega || '9999-12-31';
                return dateA.localeCompare(dateB);
            });
            
            this.render(filtered);
            this.updateTabCounts();
            this.updateTabStyles();
        },
        render(pvToRender) {
            this.ui.list.innerHTML = '';
            this.ui.pagination.innerHTML = '';
             if (pvToRender.length === 0) { this.ui.list.innerHTML = `<p class="text-gray-500 col-span-full text-center mt-8">Nenhum registro encontrado.</p>`; return; }
            
            const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
            const paginatedItems = pvToRender.slice(startIndex, startIndex + this.state.itemsPerPage);

            paginatedItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col justify-between gap-4 fade-in';
                card.dataset.id = item.id;
                const statusColor = this.colors[item.status] || 'bg-gray-100 text-gray-800';
                const whatsappButton = `<button data-action="whatsapp" class="text-green-500 hover:opacity-75"><i class="fab fa-whatsapp fa-lg"></i></button>`;
                
                const logisticaInfo = item.tipoLogistica === 'Retirada'
                    ? `<p><strong class="font-semibold text-gray-700">Retirada:</strong> <span class="font-bold text-zenir-red">${formatDate(item.dataRetirada)}</span></p>`
                    : `<p><strong class="font-semibold text-gray-700">Entrega:</strong> <span class="font-bold text-zenir-red">${formatDate(item.previsaoEntrega)}</span></p>`;

                card.innerHTML = `<div><div class="flex justify-between items-start mb-2"><h3 class="text-xl font-bold text-gray-800">${item.nome}</h3><span class="text-xs font-semibold px-2 py-1 rounded-full ${statusColor}">${item.status}</span></div><p class="text-sm text-gray-600 mb-3"><i class="fas fa-phone-alt text-gray-400 mr-2"></i>${item.contato}</p><div class="bg-gray-50 p-3 rounded-md text-sm space-y-1"><p><strong class="font-semibold text-gray-700">PV:</strong> <span class="font-normal">${item.pv || 'N/A'}</span></p><p><strong class="font-semibold text-gray-700">Produto:</strong> ${item.produto}</p>${logisticaInfo}${item.precisaMontagem && item.previsaoMontagem ? `<p><strong class="font-semibold">Montagem:</strong> <span class="font-bold text-zenir-blue">${formatDate(item.previsaoMontagem)}</span></p>` : ''}${item.observacao ? `<p><strong class="font-semibold text-gray-700">Observação:</strong> <span class="font-normal">${item.observacao}</span></p>` : ''}</div></div><div class="border-t pt-3 flex justify-end items-center gap-3">${whatsappButton}<button data-action="edit" class="text-zenir-blue hover:opacity-75"><i class="fas fa-edit fa-lg"></i></button><button data-action="delete" class="text-zenir-red hover:opacity-75"><i class="fas fa-trash-alt fa-lg"></i></button></div>`;
                this.ui.list.appendChild(card);
            });
            this.renderPagination(pvToRender.length);
        },
        renderPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
            if (totalPages <= 1) return;
            let paginationHTML = '';
            paginationHTML += `<button data-page="${this.state.currentPage - 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
            for (let i = 1; i <= totalPages; i++) { paginationHTML += `<button data-page="${i}" class="px-3 py-1 rounded-md ${this.state.currentPage === i ? 'bg-zenir-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}">${i}</button>`; }
            paginationHTML += `<button data-page="${this.state.currentPage + 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === totalPages ? 'disabled' : ''}>Próximo</button>`;
            this.ui.pagination.innerHTML = paginationHTML;
        },
        async handleFormSubmit(event, type) {
            event.preventDefault();
            const form = type === 'add' ? this.ui.addForm : this.ui.editForm;
            const modal = type === 'add' ? this.ui.addModal : this.ui.editModal;
            const idPrefix = type === 'add' ? 'pv-' : 'edit-pv-';
            const precisaMontagem = form.elements[`${idPrefix}precisa-montagem`].checked;
            const tipoLogistica = form.elements[`${idPrefix}logistica`].value;

            const data = {
                nome: form.elements[`${idPrefix}nome`].value.toUpperCase(),
                contato: form.elements[`${idPrefix}contato`].value,
                pv: form.elements[`${idPrefix}pv`].value.toUpperCase(),
                produto: form.elements[`${idPrefix}produto`].value.toUpperCase(),
                dataCompra: form.elements[`${idPrefix}data-compra`].value,
                tipoLogistica: tipoLogistica,
                previsaoEntrega: tipoLogistica === 'Entrega' ? form.elements[`${idPrefix}previsao-entrega`].value : '',
                dataRetirada: tipoLogistica === 'Retirada' ? form.elements[`${idPrefix}data-retirada`].value : '',
                precisaMontagem: precisaMontagem,
                previsaoMontagem: precisaMontagem ? form.elements[`${idPrefix}previsao-montagem`].value : '',
                status: form.elements[`${idPrefix}status`].value,
                observacao: form.elements[`${idPrefix}observacao`].value.toUpperCase(),
                userId: this.state.currentUser.uid
            };
            if (type === 'add') { await addDoc(collection(db, 'pos_venda'), data); } 
            else { const docId = form.elements['edit-pv-id'].value; await updateDoc(doc(db, 'pos_venda', docId), data); }
            modal.classList.add('hidden');
            appManager.uiManager.body.classList.remove('modal-open');
        },
        handleCardClick(event) {
            const button = event.target.closest('button');
            if (!button) return;
            const card = button.closest('[data-id]');
            const docId = card.dataset.id;
            const docData = this.state.all.find(pv => pv.id === docId);
            switch(button.dataset.action) {
                case 'delete': this.state.docToDelete = docId; appManager.deleteModalManager.show(); break;
                case 'edit': this.populateEditForm(docData); break;
                case 'whatsapp':
                    const message = this.getMessageForStatus(docData, this.state.currentUserData.preferredName);
                    const cleanPhone = '55' + docData.contato.replace(/\D/g, '');
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
                    break;
            }
        },
        populateEditForm(data) {
            const f = this.ui.editForm;
            f['edit-pv-id'].value = data.id; f['edit-pv-nome'].value = data.nome; f['edit-pv-contato'].value = data.contato;
            f['edit-pv-pv'].value = data.pv; f['edit-pv-produto'].value = data.produto; f['edit-pv-data-compra'].value = data.dataCompra;
            f['edit-pv-status'].value = data.status; f['edit-pv-precisa-montagem'].checked = data.precisaMontagem;
            f['edit-pv-observacao'].value = data.observacao || '';
            
            // Populate logistics
            const isEntrega = data.tipoLogistica !== 'Retirada'; // Default to Entrega if not set
            f.querySelector('#edit-pv-logistica-entrega').checked = isEntrega;
            f.querySelector('#edit-pv-logistica-retirada').checked = !isEntrega;

            const entregaContainer = f.querySelector('#edit-pv-entrega-container');
            const retiradaContainer = f.querySelector('#edit-pv-retirada-container');
            entregaContainer.classList.toggle('hidden', !isEntrega);
            retiradaContainer.classList.toggle('hidden', isEntrega);

            f['edit-pv-previsao-entrega'].required = isEntrega;
            f['edit-pv-data-retirada'].required = !isEntrega;

            if (isEntrega) {
                f['edit-pv-previsao-entrega'].value = data.previsaoEntrega || '';
            } else {
                f['edit-pv-data-retirada'].value = data.dataRetirada || '';
            }
            
            // Populate montagem
            const montagemContainer = f.querySelector('#edit-pv-montagem-container');
            montagemContainer.classList.toggle('hidden', !data.precisaMontagem);
            if(data.precisaMontagem) { f['edit-pv-previsao-montagem'].value = data.previsaoMontagem; }
            
            this.ui.editModal.classList.remove('hidden');
            appManager.uiManager.body.classList.add('modal-open');
        },
        getMessageForStatus(data, salesPersonName) {
            const nomeCliente = data.nome.split(' ')[0];
            const salesPersonTitle = `${salesPersonName}, Vendedor(a) da Zenir Móveis`;
            
            let aguardandoMessage;
            if (data.tipoLogistica === 'Retirada') {
                 aguardandoMessage = `Olá, ${nomeCliente}! Sou ${salesPersonTitle}. Passando para confirmar que seu produto (*${data.produto}*) já está disponível para retirada. Deu tudo certo por aí?`;
            } else { // Entrega
                 aguardandoMessage = `Olá, ${nomeCliente}! Sou ${salesPersonTitle}. Vimos que a entrega do seu produto (*${data.produto}*) estava programada para hoje. Deu tudo certo por aí? O produto chegou em perfeitas condições?`;
            }

            const messages = {
                'Aguardando Entrega': aguardandoMessage,
                'Aguardando Montagem': `Olá, ${nomeCliente}, tudo bem? Sou ${salesPersonTitle}, e estou passando para saber se a montagem do seu produto (*${data.produto}*) foi realizada e se ficou tudo como você esperava. Sua satisfação é nossa prioridade!`,
                'Concluído': `Olá, ${nomeCliente}! Que ótimo que já está tudo certo com sua compra na Zenir Móveis! ✨ Salve meu contato na sua agenda! Assim, você fica por dentro das novidades e recebe minhas melhores ofertas em primeira mão. Até a próxima!`
            };
            return messages[data.status] || `Olá ${nomeCliente}! Entrando em contato sobre a sua compra na Zenir Móveis.`;
        },
        updateTabCounts() {
             const counts = { 'Visão Geral': this.state.all.length, 'Aguardando Entrega': this.state.all.filter(l => l.status === 'Aguardando Entrega').length, 'Aguardando Montagem': this.state.all.filter(l => l.status === 'Aguardando Montagem').length, 'Concluído': this.state.all.filter(l => l.status === 'Concluído').length };
            this.ui.tabsContainer.innerHTML = Object.keys(counts).map(filter => `<button data-filter="${filter}" class="tab-pos-venda whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-sm flex items-center rounded-t-lg transition-colors duration-200"><span class="count-badge mr-2 bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">${counts[filter]}</span>${filter}</button>`).join('');
        },
        updateTabStyles() {
            this.ui.tabsContainer.querySelectorAll('.tab-pos-venda').forEach(tab => {
                const isActive = tab.dataset.filter === this.state.filter;
                tab.classList.toggle('border-zenir-blue', isActive); 
                tab.classList.toggle('text-zenir-blue', isActive);
                tab.classList.toggle('font-semibold', isActive);
                tab.classList.toggle('bg-blue-50', isActive);
                
                tab.classList.toggle('border-transparent', !isActive); 
                tab.classList.toggle('text-gray-500', !isActive);
                tab.classList.toggle('hover:text-zenir-blue', !isActive);
            });
        }
    },

    sacManager: {
       state: { all: [], filter: 'Visão Geral', docToDelete: null, currentPage: 1, itemsPerPage: 6, currentUser: null, currentUserData: null },
        ui: {
            list: document.getElementById('sac-list'),
            tabsContainer: document.getElementById('sac-tabs-container'),
            pagination: document.getElementById('sac-pagination'),
            addModal: document.getElementById('add-sac-modal'),
            editModal: document.getElementById('edit-sac-modal'),
            addForm: document.getElementById('add-sac-form'),
            editForm: document.getElementById('edit-sac-form'),
            openAddBtn: document.getElementById('open-add-sac-modal-btn'),
        },
        colors: {'Aberta': 'bg-red-100 text-red-800', 'Em Análise': 'bg-yellow-100 text-yellow-800', 'Resolvida': 'bg-green-100 text-green-800'},
        init(user, userData) { this.state.currentUser = user; this.state.currentUserData = userData; this.attachEventListeners(); this.listenForChanges(); },
        attachEventListeners() {
            this.ui.openAddBtn.addEventListener('click', () => {
                this.ui.addForm.reset();
                this.ui.addForm['sac-data'].value = getYYYYMMDD();
                this.ui.addModal.classList.remove('hidden');
                appManager.uiManager.body.classList.add('modal-open');
            });
            this.ui.addForm.addEventListener('submit', (e) => this.handleFormSubmit(e, 'add'));
            this.ui.editForm.addEventListener('submit', (e) => this.handleFormSubmit(e, 'edit'));
            this.ui.addForm['sac-contato'].addEventListener('input', maskPhone);
            this.ui.editForm['edit-sac-contato'].addEventListener('input', maskPhone);
            this.ui.addForm['sac-pv'].addEventListener('input', maskPV);
            this.ui.editForm['edit-sac-pv'].addEventListener('input', maskPV);
            this.ui.list.addEventListener('click', (e) => this.handleCardClick(e));
            this.ui.tabsContainer.addEventListener('click', (e) => {
                const targetTab = e.target.closest('.tab-sac');
                if(targetTab) { this.state.filter = targetTab.dataset.filter; this.state.currentPage = 1; this.filterAndRender(); }
            });
            this.ui.pagination.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (button && button.dataset.page) { this.state.currentPage = parseInt(button.dataset.page); this.filterAndRender(); }
            });
        },
        listenForChanges() {
            const q = query(collection(db, 'sac_occurrences'), where("userId", "==", this.state.currentUser.uid));
            onSnapshot(q, (snapshot) => {
                this.state.all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.filterAndRender();
            });
        },
        filterAndRender() {
            let filtered = this.state.all;

            if (this.state.filter !== 'Visão Geral') {
                filtered = this.state.all.filter(item => item.status === this.state.filter);
            }

            const statusPriority = { 'Aberta': 1, 'Em Análise': 2, 'Resolvida': 3 };

            filtered.sort((a, b) => {
                if (this.state.filter === 'Visão Geral') {
                    const priorityA = statusPriority[a.status] || 4;
                    const priorityB = statusPriority[b.status] || 4;
                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }
                }
                const dateA = a.data || '9999-12-31';
                const dateB = b.data || '9999-12-31';
                return dateA.localeCompare(dateB);
            });
            
            this.render(filtered);
            this.updateTabCounts();
            this.updateTabStyles();
        },
        render(itemsToRender) {
            this.ui.list.innerHTML = '';
            this.ui.pagination.innerHTML = '';
            if (itemsToRender.length === 0) { this.ui.list.innerHTML = `<p class="text-gray-500 col-span-full text-center mt-8">Nenhuma ocorrência encontrada.</p>`; return; }
            
            const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
            const paginatedItems = itemsToRender.slice(startIndex, startIndex + this.state.itemsPerPage);

            paginatedItems.forEach(item => {
                const card = document.createElement('div');
                card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col justify-between gap-4 fade-in';
                card.dataset.id = item.id;
                const statusColor = this.colors[item.status] || 'bg-gray-100 text-gray-800';
                card.innerHTML = `<div><div class="flex justify-between items-start mb-2"><h3 class="text-xl font-bold text-gray-800">${item.nome}</h3><span class="text-xs font-semibold px-2 py-1 rounded-full ${statusColor}">${item.status}</span></div><p class="text-sm text-gray-600 mb-3"><i class="fas fa-phone-alt text-gray-400 mr-2"></i>${item.contato}</p><div class="bg-gray-50 p-3 rounded-md text-sm space-y-1"><p><strong class="font-semibold text-gray-700">PV:</strong> <span class="font-normal">${item.pv || 'N/A'}</span></p><p><strong class="font-semibold text-gray-700">Tipo:</strong> ${item.tipo}</p><p><strong class="font-semibold text-gray-700">Descrição:</strong> ${item.descricao}</p>${item.observacao ? `<p><strong class="font-semibold text-gray-700">Observação:</strong> <span class="font-normal">${item.observacao}</span></p>` : ''}</div></div><div class="border-t pt-3 flex justify-between items-center"><div class="text-sm text-gray-500">Data: ${formatDate(item.data)}</div><div class="flex gap-3"><button data-action="edit" class="text-zenir-blue hover:opacity-75"><i class="fas fa-edit fa-lg"></i></button><button data-action="delete" class="text-zenir-red hover:opacity-75"><i class="fas fa-trash-alt fa-lg"></i></button></div></div>`;
                this.ui.list.appendChild(card);
            });
            this.renderPagination(itemsToRender.length);
        },
        renderPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
            if (totalPages <= 1) return;
            let paginationHTML = '';
            paginationHTML += `<button data-page="${this.state.currentPage - 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
            for (let i = 1; i <= totalPages; i++) { paginationHTML += `<button data-page="${i}" class="px-3 py-1 rounded-md ${this.state.currentPage === i ? 'bg-zenir-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}">${i}</button>`; }
            paginationHTML += `<button data-page="${this.state.currentPage + 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === totalPages ? 'disabled' : ''}>Próximo</button>`;
            this.ui.pagination.innerHTML = paginationHTML;
        },
        async handleFormSubmit(event, type) {
            event.preventDefault();
            const form = type === 'add' ? this.ui.addForm : this.ui.editForm;
            const modal = type === 'add' ? this.ui.addModal : this.ui.editModal;
            const idPrefix = type === 'add' ? 'sac-' : 'edit-sac-';
            const data = {
                nome: form.elements[`${idPrefix}nome`].value.toUpperCase(),
                contato: form.elements[`${idPrefix}contato`].value,
                pv: form.elements[`${idPrefix}pv`].value.toUpperCase(),
                data: form.elements[`${idPrefix}data`].value,
                tipo: form.elements[`${idPrefix}tipo`].value,
                descricao: form.elements[`${idPrefix}descricao`].value.toUpperCase(),
                status: form.elements[`${idPrefix}status`].value,
                observacao: form.elements[`${idPrefix}observacao`].value.toUpperCase(),
                userId: this.state.currentUser.uid,
            };
            if (type === 'add') { await addDoc(collection(db, 'sac_occurrences'), data); } 
            else { const docId = form.elements['edit-sac-id'].value; await updateDoc(doc(db, 'sac_occurrences', docId), data); }
            modal.classList.add('hidden');
            appManager.uiManager.body.classList.remove('modal-open');
        },
        handleCardClick(event) {
            const button = event.target.closest('button');
            if (!button) return;
            const card = button.closest('[data-id]');
            const docId = card.dataset.id;
            switch(button.dataset.action) {
                case 'delete': this.state.docToDelete = docId; appManager.deleteModalManager.show(); break;
                case 'edit': this.populateEditForm(this.state.all.find(item => item.id === docId)); break;
            }
        },
        populateEditForm(data) {
            const f = this.ui.editForm;
            f['edit-sac-id'].value = data.id; f['edit-sac-nome'].value = data.nome; f['edit-sac-contato'].value = data.contato;
            f['edit-sac-pv'].value = data.pv; f['edit-sac-data'].value = data.data; f['edit-sac-tipo'].value = data.tipo;
            f['edit-sac-descricao'].value = data.descricao; f['edit-sac-status'].value = data.status;
            f['edit-sac-observacao'].value = data.observacao || '';
            this.ui.editModal.classList.remove('hidden');
            appManager.uiManager.body.classList.add('modal-open');
        },
        updateTabCounts() {
             const counts = { 'Visão Geral': this.state.all.length, 'Aberta': this.state.all.filter(l => l.status === 'Aberta').length, 'Em Análise': this.state.all.filter(l => l.status === 'Em Análise').length, 'Resolvida': this.state.all.filter(l => l.status === 'Resolvida').length };
            this.ui.tabsContainer.innerHTML = Object.keys(counts).map(filter => `<button data-filter="${filter}" class="tab-sac whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-sm flex items-center rounded-t-lg transition-colors duration-200"><span class="count-badge mr-2 bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">${counts[filter]}</span>${filter}</button>`).join('');
        },
        updateTabStyles() {
            this.ui.tabsContainer.querySelectorAll('.tab-sac').forEach(tab => {
                const isActive = tab.dataset.filter === this.state.filter;
                tab.classList.toggle('border-zenir-blue', isActive); 
                tab.classList.toggle('text-zenir-blue', isActive);
                tab.classList.toggle('font-semibold', isActive);
                tab.classList.toggle('bg-blue-50', isActive);
                
                tab.classList.toggle('border-transparent', !isActive); 
                tab.classList.toggle('text-gray-500', !isActive);
                tab.classList.toggle('hover:text-zenir-blue', !isActive);
            });
        }
    },
    
    usersManager: {
        ADMIN_EMAIL: 'washington.wn8@gmail.com',
        state: { all: [], filter: 'Aprovados', docToDelete: null, currentPage: 1, itemsPerPage: 6, currentUser: null },
        ui: {
            list: document.getElementById('users-list'),
            tabsContainer: document.getElementById('users-tabs-container'),
            pagination: document.getElementById('users-pagination'),
            editModal: document.getElementById('edit-user-modal'),
            editForm: document.getElementById('edit-user-form'),
        },
        colors: {'Pendente': 'bg-yellow-100 text-yellow-800', 'Aprovado': 'bg-green-100 text-green-800', 'Inativo': 'bg-red-100 text-red-800'},
        
        init(user) { this.state.currentUser = user; this.attachEventListeners(); this.listenForChanges(); },
        
        attachEventListeners() {
            this.ui.list.addEventListener('click', (e) => this.handleCardClick(e));
            this.ui.tabsContainer.addEventListener('click', (e) => {
                const targetTab = e.target.closest('.tab-users');
                if(targetTab) { this.state.filter = targetTab.dataset.filter; this.state.currentPage = 1; this.filterAndRender(); }
            });
            this.ui.pagination.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (button && button.dataset.page) { this.state.currentPage = parseInt(button.dataset.page); this.filterAndRender(); }
            });
            this.ui.editForm.addEventListener('submit', (e) => this.handleEditFormSubmit(e));
            this.ui.editForm['edit-user-phone'].addEventListener('input', maskPhone);
        },
        
        listenForChanges() {
            if (this.state.currentUser.email !== this.ADMIN_EMAIL) return;
            onSnapshot(query(collection(db, 'users')), (snapshot) => {
                this.state.all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.filterAndRender();
            });
        },

        filterAndRender() { 
            let filtered = [];
            switch(this.state.filter) {
                case 'Aprovados': filtered = this.state.all.filter(u => u.status === 'Aprovado'); break;
                case 'Inativos': filtered = this.state.all.filter(u => u.status === 'Inativo'); break;
                case 'Pendentes': filtered = this.state.all.filter(u => u.status === 'Pendente'); break;
                default: filtered = [...this.state.all]; break;
            }
            this.render(filtered);
            this.updateTabCounts();
            this.updateTabStyles();
        },
        render(usersToRender) { 
            this.ui.list.innerHTML = '';
            this.ui.pagination.innerHTML = '';
            if(usersToRender.length === 0) { this.ui.list.innerHTML = '<p class="p-4 text-center text-gray-500">Nenhum usuário encontrado.</p>'; return; }

            const paginatedItems = usersToRender.slice((this.state.currentPage - 1) * this.state.itemsPerPage, this.state.currentPage * this.state.itemsPerPage);

            paginatedItems.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b';
                userDiv.dataset.id = user.id;

                const statusColor = this.colors[user.status] || 'bg-gray-100 text-gray-800';
                const isAdmin = user.email === this.ADMIN_EMAIL;

                let actionButtonsHTML = '';
                if (user.status === 'Pendente') {
                    actionButtonsHTML += `<button data-action="approve" class="bg-green-500 text-white px-3 py-1 rounded-md text-xs hover:bg-green-600">Aprovar</button>`;
                }
                if (user.status === 'Aprovado' && !isAdmin) {
                    actionButtonsHTML += `<button data-action="deactivate" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-xs hover:bg-yellow-600">Inativar</button>`;
                }
                if (user.status === 'Inativo' && !isAdmin) {
                    actionButtonsHTML += `<button data-action="approve" class="bg-green-500 text-white px-3 py-1 rounded-md text-xs hover:bg-green-600">Reativar</button>`;
                }
                
                actionButtonsHTML += `<button data-action="edit" class="text-zenir-blue hover:opacity-75"><i class="fas fa-edit"></i></button>`;
                
                if (!isAdmin) {
                    actionButtonsHTML += `<button data-action="delete" class="text-zenir-red hover:opacity-75"><i class="fas fa-trash-alt"></i></button>`;
                } else {
                    actionButtonsHTML += `<div class="w-6"></div>`;
                }

                userDiv.innerHTML = `
                    <div class="flex-1 mb-4 sm:mb-0">
                        <p class="font-bold text-gray-800">${user.name} ${isAdmin ? '<span class="text-xs text-zenir-red font-bold">(Admin)</span>' : ''}</p>
                        <p class="text-sm text-gray-600">${user.email}</p>
                        <p class="text-sm text-gray-500">Telefone: ${user.phone || 'N/A'}</p>
                        <p class="text-sm text-gray-500">Filial: ${user.filial || 'N/A'}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                         <span class="text-xs font-semibold px-2 py-1 rounded-full ${statusColor}">${user.status}</span>
                         ${actionButtonsHTML}
                    </div>
                `;
                this.ui.list.appendChild(userDiv);
            });
             this.renderPagination(usersToRender.length);
        },
        renderPagination(totalItems) {
            const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);
            if (totalPages <= 1) return;
            let paginationHTML = '';
            paginationHTML += `<button data-page="${this.state.currentPage - 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === 1 ? 'disabled' : ''}>Anterior</button>`;
            for (let i = 1; i <= totalPages; i++) { paginationHTML += `<button data-page="${i}" class="px-3 py-1 rounded-md ${this.state.currentPage === i ? 'bg-zenir-blue text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}">${i}</button>`; }
            paginationHTML += `<button data-page="${this.state.currentPage + 1}" class="px-3 py-1 rounded-md ${this.state.currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-100'}" ${this.state.currentPage === totalPages ? 'disabled' : ''}>Próximo</button>`;
            this.ui.pagination.innerHTML = paginationHTML;
         },
         updateTabCounts() {
            const counts = { 'Pendentes': this.state.all.filter(u => u.status === 'Pendente').length, 'Aprovados': this.state.all.filter(u => u.status === 'Aprovado').length, 'Inativos': this.state.all.filter(u => u.status === 'Inativo').length };
            this.ui.tabsContainer.innerHTML = Object.keys(counts).map(filter => `<button data-filter="${filter}" class="tab-users whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-sm flex items-center rounded-t-lg transition-colors duration-200"><span class="count-badge mr-2 bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">${counts[filter]}</span>${filter}</button>`).join('');
        },
        updateTabStyles() { 
            this.ui.tabsContainer.querySelectorAll('.tab-users').forEach(tab => {
                const isActive = tab.dataset.filter === this.state.filter;
                tab.classList.toggle('border-zenir-blue', isActive); 
                tab.classList.toggle('text-zenir-blue', isActive);
                tab.classList.toggle('font-semibold', isActive);
                tab.classList.toggle('bg-blue-50', isActive);
                
                tab.classList.toggle('border-transparent', !isActive); 
                tab.classList.toggle('text-gray-500', !isActive);
                tab.classList.toggle('hover:text-zenir-blue', !isActive);
            });
        },
        async handleCardClick(event) {
            const button = event.target.closest('button');
            if (!button) return;
            const card = button.closest('[data-id]');
            const userId = card.dataset.id;
            const action = button.dataset.action;
            const user = this.state.all.find(u => u.id === userId);

            if (user && user.email === this.ADMIN_EMAIL && (action === 'deactivate' || action === 'delete')) {
                alert('A conta do administrador não pode ser alterada.');
                return;
            }

            switch(action) {
                case 'approve': await updateDoc(doc(db, 'users', userId), { status: 'Aprovado' }); break;
                case 'deactivate': await updateDoc(doc(db, 'users', userId), { status: 'Inativo' }); break;
                case 'delete':
                    this.state.docToDelete = userId;
                    appManager.deleteModalManager.show();
                    break;
                case 'edit':
                    if (user) {
                        this.populateEditForm(user);
                    }
                    break;
            }
        },
        async handleEditFormSubmit(event) {
            event.preventDefault();
            const form = this.ui.editForm;
            const userId = form['edit-user-id'].value;
            const userData = {
                name: form['edit-user-name'].value.toUpperCase(),
                preferredName: form['edit-user-preferred-name'].value.toUpperCase(),
                phone: form['edit-user-phone'].value,
                filial: form['edit-user-filial'].value.toUpperCase(),
            };
            await updateDoc(doc(db, 'users', userId), userData);
            this.ui.editModal.classList.add('hidden');
            appManager.uiManager.body.classList.remove('modal-open');
        },
        populateEditForm(data) {
            const f = this.ui.editForm;
            f['edit-user-id'].value = data.id;
            f['edit-user-name'].value = data.name;
            f['edit-user-preferred-name'].value = data.preferredName || '';
            f['edit-user-phone'].value = data.phone;
            f['edit-user-filial'].value = data.filial;
            this.ui.editModal.classList.remove('hidden');
            appManager.uiManager.body.classList.add('modal-open');
        },
    }
};

// --- INICIALIZAÇÃO ---
appManager.authManager.init();

