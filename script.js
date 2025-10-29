/*
  E-Shop UNAD - script.js
  Simulación completa (frontend) de ecommerce para pruebas y demostraciones.
  - Autenticación simulada en memoria
  - Gestión de perfil en memoria
  - Catálogo con productos predefinidos
  - Carrito, checkout simulado, seguimiento de pedidos (memoria)
  - Reseñas y soporte en memoria
*/

(() => {
  // === Datos de catálogo y estado en memoria ===
  const products = [
    { id: 'p1', title: 'Auriculares Bluetooth X1', category:'electronics', price: 59.99, img:'https://unsplash.com/es/fotos/dedo-sosteniendo-auriculares-azules-sobre-fondo-blanco-XikjEVID1_A', desc:'Auriculares inalámbricos con cancelación de ruido.' },
    { id: 'p2', title: 'Smartwatch Pro 4', category:'electronics', price: 129.00, img:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=5de4b7ee7b1a2a0df3f6c6a4c8c6e5f1', desc:'Monitor de actividad con GPS y 7 días de batería.' },
    { id: 'p3', title: 'Cafetera Compacta', category:'home', price: 79.50, img:'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=2a1f1f1c0bd3cfe8f0d3a5b1b7b6a2c2', desc:'Cafetera de cápsulas con tanque de 1L.' },
    { id: 'p4', title: 'Lámpara LED de Mesa', category:'home', price: 24.99, img:'https://unsplash.com/es/fotos/una-persona-sosteniendo-una-bombilla-en-la-mano-KILHxvdh7zo', desc:'Lámpara regulable con puerto USB.' },
    { id: 'p5', title: 'Libro: Ingeniería de Software', category:'books', price: 39.90, img:'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e', desc:'Texto de referencia sobre procesos y calidad de software.' },
    { id: 'p6', title: 'Mochila Urbana', category:'home', price: 49.00, img:'https://unsplash.com/es/fotos/foto-de-enfoque-superficial-de-mujer-con-camisa-negra-de-manga-larga-9oMlswz4jiE', desc:'Mochila resistente, compartimento para laptop 15".' }
  ];

  // Estado en memoria
  let cart = {}; // { productId: qty }
  let orders = []; // lista de pedidos {orderId,status,items,total,date,customer}
  let reviews = [
    { name:'Camila', rating:5, text:'Excelente prototipo, navegación clara.' },
    { name:'Diego', rating:4, text:'Buen diseño y rapidez de carga.' }
  ];
  let supportTickets = []; // {id,name,email,topic,message,date}
  let currentUser = null; // {name,email}

  // Elementos DOM
  const $ = id => document.getElementById(id);
  function q(sel, root=document){return root.querySelector(sel)}
  function qAll(sel, root=document){return Array.from(root.querySelectorAll(sel))}

  // Inicializar
  function init(){
    renderProducts(products);
    renderCart();
    renderReviews();
    bindUI();
  }

  function bindUI(){
    $('searchInput').addEventListener('input', onFilterChange);
    $('categoryFilter').addEventListener('change', onFilterChange);
    $('btnCart').addEventListener('click', ()=> location.hash='#carrito');
    $('shipping').addEventListener('change', renderCart);
    $('checkoutBtn').addEventListener('click', checkout);
    $('trackBtn').addEventListener('click', trackOrder);
    $('reviewForm').addEventListener('submit', submitReview);
    $('supportForm').addEventListener('submit', submitSupport);
    document.querySelector('#btnLogin').addEventListener('click', openLogin);
    $('closeModal').addEventListener('click', closeModal);
    $('modalOverlay').addEventListener('click', e=>{ if(e.target === $('modalOverlay')) closeModal(); });
    $('loginForm').addEventListener('submit', loginSubmit);
    $('btnRegister').addEventListener('click', ()=>{ $('loginMsg').textContent='Registro simulado: cuenta creada.'; setTimeout(()=> $('loginMsg').textContent='',2000); });
    $('saveProfile').addEventListener('click', saveProfile);
    $('logoutBtn').addEventListener('click', logout);
  }

  // Render productos
  function renderProducts(list){
    const grid = $('productsGrid');
    grid.innerHTML='';
    if(!list.length){ grid.innerHTML='<p class="muted">No se encontraron productos.</p>'; return; }
    list.forEach(p=>{
      const card = document.createElement('article');
      card.className='product';
      card.innerHTML = `
        <img src="${p.img}" alt="${p.title}">
        <h4>${p.title}</h4>
        <p class="muted small">${p.desc}</p>
        <div class="meta">
          <span class="price">$${p.price.toFixed(2)}</span>
          <div class="actions">
            <button class="btn btn-sm btn-outline" data-id="${p.id}" data-action="view">Ver</button>
            <button class="btn btn-sm btn-primary" data-id="${p.id}" data-action="add">Agregar</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });
    qAll('[data-action="add"]', grid).forEach(b=> b.addEventListener('click', ()=> addToCart(b.dataset.id)));
    qAll('[data-action="view"]', grid).forEach(b=> b.addEventListener('click', ()=> viewProduct(b.dataset.id)));
  }

  // Filtrado
  function onFilterChange(){
    const qStr = $('searchInput').value.trim().toLowerCase();
    const cat = $('categoryFilter').value;
    const filtered = products.filter(p=> {
      const matchCat = (cat==='all') ? true : p.category === cat;
      const matchQ = p.title.toLowerCase().includes(qStr) || p.desc.toLowerCase().includes(qStr);
      return matchCat && matchQ;
    });
    renderProducts(filtered);
  }

  // Carrito
  function addToCart(id, qty=1){
    cart[id] = (cart[id]||0) + qty;
    renderCart();
    showToast('Producto agregado al carrito');
  }
  function removeFromCart(id){ delete cart[id]; renderCart(); }
  function updateQty(id, delta){ if(!cart[id]) return; cart[id]=Math.max(0, cart[id]+delta); if(cart[id]===0) removeFromCart(id); renderCart(); }

  function renderCart(){
    const container = $('cartItems');
    container.innerHTML='';
    const ids = Object.keys(cart);
    if(!ids.length){ container.innerHTML = '<p class="muted">Tu carrito está vacío — agrega productos desde el catálogo.</p>'; }
    else{
      ids.forEach(id=>{
        const p = products.find(x=>x.id===id);
        const qty = cart[id];
        const row = document.createElement('div');
        row.className='cart-item';
        row.innerHTML = `
          <img src="${p.img}" alt="${p.title}">
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <strong>${p.title}</strong>
              <span class="muted small">$${(p.price*qty).toFixed(2)}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
              <div class="qty-control">
                <button class="btn btn-sm btn-outline" data-action="dec" data-id="${id}">−</button>
                <div style="padding:0 8px">${qty}</div>
                <button class="btn btn-sm btn-outline" data-action="inc" data-id="${id}">+</button>
              </div>
              <button class="btn btn-sm" style="background:transparent;color:var(--muted)" data-action="rm" data-id="${id}">Eliminar</button>
            </div>
          </div>`;
        container.appendChild(row);
      });
      qAll('[data-action="inc"]', container).forEach(b => b.addEventListener('click', ()=> updateQty(b.dataset.id, 1)));
      qAll('[data-action="dec"]', container).forEach(b => b.addEventListener('click', ()=> updateQty(b.dataset.id, -1)));
      qAll('[data-action="rm"]', container).forEach(b => b.addEventListener('click', ()=> removeFromCart(b.dataset.id)));
    }
    // summary
    let count=0, total=0;
    Object.keys(cart).forEach(id=>{ const p=products.find(x=>x.id===id); count+=cart[id]; total+=cart[id]*p.price; });
    $('cartCount').textContent = count;
    $('summaryCount').textContent = count;
    const shipPrice = parseFloat($('shipping').selectedOptions[0].dataset.price || 0);
    $('summaryTotal').textContent = `$${(total + shipPrice).toFixed(2)}`;
    $('checkoutBtn').disabled = count===0;
  }

  // Checkout simulado
  function checkout(){
    if(Object.keys(cart).length===0){ $('checkoutMsg').textContent = 'Agrega productos antes de pagar.'; return; }
    $('checkoutMsg').textContent = 'Procesando pedido (simulado)...';
    $('checkoutBtn').disabled = true;
    setTimeout(()=>{
      const orderId = 'ORD-2025-' + String(Math.floor(Math.random()*9000)+1000);
      const items = Object.keys(cart).map(id=>({ id, qty: cart[id], product: products.find(p=>p.id===id).title }));
      const totalStr = $('summaryTotal').textContent;
      orders.push({ orderId, items, status:'En preparación', total: totalStr, date:new Date().toISOString(), customer: currentUser?currentUser.email:'Anon' });
      cart={};
      renderCart();
      $('checkoutMsg').innerHTML = `✅ Pedido creado: <strong>${orderId}</strong>. Puedes consultarlo en Seguimiento.`;
      showToast(`Pedido ${orderId} creado`);
      setTimeout(()=> $('checkoutMsg').textContent='', 8000);
    }, 1200);
  }

  // Tracking
  function trackOrder(){
    const q = $('trackInput').value.trim();
    if(!q){ $('trackResult').textContent = 'Ingrese un ID de pedido válido.'; return; }
    const found = orders.find(o=>o.orderId.toLowerCase()===q.toLowerCase());
    if(!found){ $('trackResult').innerHTML = `<p class="muted">Pedido no encontrado (mock). Ejemplo válido: ${orders.length>0?orders[0].orderId:'ORD-2025-0001'}</p>`; return; }
    $('trackResult').innerHTML = `
      <div><strong>Pedido:</strong> ${found.orderId}</div>
      <div><strong>Estado:</strong> ${found.status}</div>
      <div><strong>Fecha:</strong> ${new Date(found.date).toLocaleString()}</div>
      <div><strong>Total:</strong> ${found.total}</div>
      <div style="margin-top:8px"><strong>Items:</strong><ul>${found.items.map(it=>`<li>${it.product} × ${it.qty}</li>`).join('')}</ul></div>
    `;
  }

  // Reviews
  function renderReviews(){
    const list = $('reviewsList');
    list.innerHTML='';
    reviews.forEach(r=>{
      const node = document.createElement('div');
      node.className='review';
      node.innerHTML = `<strong>${r.name}</strong> — <span class="muted small">${'★'.repeat(r.rating)}</span><p class="muted small">${r.text}</p>`;
      list.appendChild(node);
    });
  }
  function submitReview(e){
    e.preventDefault();
    if(!currentUser){ showToast('Debes iniciar sesión para dejar una reseña'); return; }
    const name = $('revName').value.trim() || currentUser.name;
    const rating = parseInt($('revRating').value);
    const text = $('revText').value.trim();
    if(!name || !rating || !text) return;
    reviews.unshift({ name, rating, text });
    renderReviews();
    e.target.reset();
    showToast('Reseña enviada (simulada)');
  }

  // Support
  function submitSupport(e){
    e.preventDefault();
    const name = $('supName').value.trim();
    const email = $('supEmail').value.trim();
    const topic = $('supTopic').value;
    const msg = $('supMessage').value.trim();
    if(!name || !email || !topic || !msg) return;
    const ticketId = 'TCK-' + String(Math.floor(Math.random()*90000)+1000);
    supportTickets.push({ id: ticketId, name, email, topic, message: msg, date: new Date().toISOString() });
    $('supportFeedback').textContent = `Solicitud enviada. Ticket: ${ticketId}`;
    e.target.reset();
    setTimeout(()=> $('supportFeedback').textContent='', 8000);
  }

  // View product modal (uses same modal)
  function viewProduct(id){
    const p = products.find(x=>x.id===id);
    if(!p) return;
    const overlay = $('modalOverlay');
    $('modalTitle').textContent = p.title;
    $('loginForm').classList.add('hidden');
    $('profileView').classList.add('hidden');
    let custom = document.createElement('div');
    custom.className = 'custom-view';
    custom.innerHTML = `
      <img src="${p.img}" alt="${p.title}" style="width:100%;border-radius:8px;margin-bottom:8px">
      <p class="muted">${p.desc}</p>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button id="addHere" class="btn btn-primary">Agregar al carrito</button>
        <button id="closeView" class="btn btn-outline">Cerrar</button>
      </div>
    `;
    const modal = document.querySelector('.modal');
    // remove previous custom view
    const prev = modal.querySelector('.custom-view'); if(prev) prev.remove();
    modal.appendChild(custom);
    overlay.classList.remove('hidden');
    $('addHere').addEventListener('click', ()=>{ addToCart(id); closeModal(); });
    $('closeView').addEventListener('click', closeModal);
  }

  // Modal and auth
  function openLogin(){
    $('modalTitle').textContent = 'Iniciar sesión / Perfil';
    $('loginForm').classList.remove('hidden');
    $('profileView').classList.add('hidden');
    $('loginMsg').textContent='';
    $('loginForm').reset();
    $('modalOverlay').classList.remove('hidden');
  }
  function closeModal(){
    $('modalOverlay').classList.add('hidden');
    const modal = document.querySelector('.modal');
    const prev = modal.querySelector('.custom-view'); if(prev) prev.remove();
  }

  function loginSubmit(e){
    e.preventDefault();
    const email = $('loginEmail').value.trim();
    const pass = $('loginPass').value.trim();
    if(!email || !pass){ $('loginMsg').textContent='Ingrese credenciales válidas'; return; }
    // Simular autenticación: crear usuario si no existe
    currentUser = { name: email.split('@')[0], email };
    updateUserArea();
    $('loginMsg').textContent = 'Autenticación simulada: sesión iniciada';
    setTimeout(()=>{ $('loginMsg').textContent=''; $('loginForm').classList.add('hidden'); showProfile(); }, 800);
  }

  function showProfile(){
    if(!currentUser) return;
    $('profileView').classList.remove('hidden');
    $('profileName').value = currentUser.name;
    $('profileEmail').value = currentUser.email;
    $('modalTitle').textContent = 'Mi perfil';
  }

  function saveProfile(){
    const name = $('profileName').value.trim();
    if(!name){ $('profileMsg').textContent='Nombre no puede estar vacío'; setTimeout(()=> $('profileMsg').textContent='',2000); return; }
    currentUser.name = name;
    $('profileMsg').textContent='Perfil actualizado (simulado)';
    updateUserArea();
    setTimeout(()=> $('profileMsg').textContent='',2000);
  }

  function logout(){
    currentUser = null;
    updateUserArea();
    closeModal();
    showToast('Sesión cerrada');
  }

  function updateUserArea(){
    const ua = document.querySelector('.user-area');
    ua.innerHTML = '';
    if(currentUser){
      const span = document.createElement('span');
      span.className='user-name muted small';
      span.textContent = currentUser.name;
      const btn = document.createElement('button');
      btn.className='btn btn-outline';
      btn.textContent = 'Perfil';
      btn.addEventListener('click', ()=>{ $('modalTitle').textContent='Mi perfil'; $('profileView').classList.remove('hidden'); $('loginForm').classList.add('hidden'); $('modalOverlay').classList.remove('hidden'); showProfile(); });
      ua.appendChild(span);
      ua.appendChild(btn);
    } else {
      const b = document.createElement('button');
      b.id='btnLogin2';
      b.className='btn btn-outline';
      b.textContent='Iniciar sesión';
      b.addEventListener('click', openLogin);
      ua.appendChild(b);
    }
  }

  // Utilities: toast
  function showToast(msg){
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.position = 'fixed';
    t.style.right = '20px';
    t.style.bottom = '20px';
    t.style.background = '#0b1220';
    t.style.color = '#fff';
    t.style.padding = '10px 14px';
    t.style.borderRadius = '8px';
    t.style.boxShadow = '0 8px 30px rgba(3,10,26,0.35)';
    document.body.appendChild(t);
    setTimeout(()=> t.style.opacity = '0', 2200);
    setTimeout(()=> t.remove(), 2600);
  }

  // Inicializar DOMContent
  document.addEventListener('DOMContentLoaded', init);
})();
