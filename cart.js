// ============================================
// URBANCITY CART SYSTEM - FIXED
// ============================================

// Cart state
let cart = {
    items: [],
    total: 0
};

// ============================================
// CORE CART FUNCTIONS
// ============================================

function loadCart() {
    try {
        const savedCart = localStorage.getItem('urbancity_cart');
        if (savedCart) {
            const parsed = JSON.parse(savedCart);
            cart.items = parsed.items || [];
            cart.total = parsed.total || 0;
            console.log('✅ Cart loaded:', cart.items.length, 'items');
        } else {
            cart = { items: [], total: 0 };
            console.log('📦 No saved cart found, starting empty');
        }
    } catch (e) {
        console.error('❌ Error loading cart:', e);
        cart = { items: [], total: 0 };
    }
    updateCartUI();
}

function saveCart() {
    try {
        updateCartTotals();
        localStorage.setItem('urbancity_cart', JSON.stringify(cart));
        console.log('✅ Cart saved:', cart.items.length, 'items, total:', cart.total);
    } catch (e) {
        console.error('❌ Error saving cart:', e);
    }
}

function updateCartTotals() {
    cart.total = cart.items.reduce((sum, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 0;
        return sum + (price * quantity);
    }, 0);
}

// ============================================
// ADD TO CART - FIXED
// ============================================

function addToCart(itemId, itemName, price, variant = null, quantity = 1) {
    console.log('🛒 addToCart called:', { itemId, itemName, price, variant });
    
    // --- FIX: Handle cases where itemId is an object ---
    let finalId = itemId;
    if (typeof itemId === 'object' && itemId !== null) {
        // If itemId is an object, try to get the actual ID
        finalId = itemId.item_id || itemId.id || itemId.key || JSON.stringify(itemId);
        console.log('🔄 Extracted ID from object:', finalId);
    }
    
    // --- FIX: Handle cases where itemName is an object ---
    let finalName = itemName;
    if (typeof itemName === 'object' && itemName !== null) {
        finalName = itemName.name || itemName.display || itemName.displayName || 'Item';
        console.log('🔄 Extracted name from object:', finalName);
    }
    
    // --- FIX: Ensure price is a number ---
    let finalPrice = typeof price === 'number' ? price : 0;
    if (typeof price === 'string') {
        finalPrice = parseInt(price.replace(/[^0-9]/g, '')) || 0;
    }
    
    // --- FIX: If price is 0, try to get it from the DOM ---
    if (finalPrice === 0 && finalId) {
        const menuItemEl = document.querySelector(`.menu-item[data-id="${finalId}"]`);
        if (menuItemEl) {
            // Try to get selected variant price
            const selectedVariant = menuItemEl.querySelector('.variant-btn.selected');
            if (selectedVariant) {
                const priceAttr = selectedVariant.dataset.price;
                if (priceAttr) {
                    finalPrice = parseInt(priceAttr);
                    console.log('🔄 Found price from selected variant:', finalPrice);
                    // Also get the variant text
                    if (!variant) {
                        const variantText = selectedVariant.textContent.trim();
                        const match = variantText.match(/^(.+?)\s*–\s*₦/);
                        if (match) {
                            variant = match[1].trim();
                            console.log('🔄 Extracted variant from selected button:', variant);
                        }
                    }
                }
            }
            
            // If still 0, try item-price
            if (finalPrice === 0) {
                const priceEl = menuItemEl.querySelector('.item-price');
                if (priceEl) {
                    const priceText = priceEl.textContent;
                    const match = priceText.match(/₦([\d,]+)/);
                    if (match) {
                        finalPrice = parseInt(match[1].replace(/,/g, ''));
                        console.log('🔄 Found price from item-price:', finalPrice);
                    }
                }
            }
        }
    }
    
    // --- FIX: If variant is still null, try to get it from the DOM ---
    if (!variant && finalId) {
        const menuItemEl = document.querySelector(`.menu-item[data-id="${finalId}"]`);
        if (menuItemEl) {
            const selectedVariant = menuItemEl.querySelector('.variant-btn.selected');
            if (selectedVariant) {
                const variantText = selectedVariant.textContent.trim();
                const match = variantText.match(/^(.+?)\s*–\s*₦/);
                if (match) {
                    variant = match[1].trim();
                    console.log('🔄 Extracted variant from DOM:', variant);
                }
            }
        }
    }
    
    // --- FIX: Create a unique key that includes variant ---
    // This is the most important part - different variants MUST have different keys
    let itemKey;
    if (variant) {
        // If variant exists, use it in the key
        itemKey = `${finalId}-${variant}`;
    } else if (finalPrice > 0) {
        // If no variant but different price, use price in key
        itemKey = `${finalId}-${finalPrice}`;
    } else {
        itemKey = finalId;
    }
    
    console.log('📦 Final processed item:', { 
        finalId, 
        finalName, 
        finalPrice, 
        variant, 
        itemKey 
    });
    
    if (!finalId) {
        console.error('❌ No item ID found!');
        showToast('⚠️ Error adding item to cart');
        return;
    }
    
    if (finalPrice === 0 || isNaN(finalPrice)) {
        console.warn('⚠️ Invalid price for item:', finalName);
        showToast('⚠️ Please select a valid option for this item');
        return;
    }
    
    // --- FIX: Check if item with SAME KEY exists ---
    const existingItem = cart.items.find(item => item.key === itemKey);
    
    if (existingItem) {
        existingItem.quantity += quantity;
        console.log('✅ Updated existing item quantity:', existingItem.quantity);
    } else {
        // Create display name with variant if available
        const displayName = variant ? `${finalName} (${variant})` : finalName;
        
        cart.items.push({
            key: itemKey,
            id: finalId,
            name: finalName,
            price: finalPrice,
            variant: variant || null,
            quantity: quantity,
            displayName: displayName
        });
        console.log('✅ Added new item to cart:', displayName, 'Price:', finalPrice);
    }
    
    updateCartTotals();
    saveCart();
    updateCartUI();
    
    const displayMsg = variant ? `${finalName} (${variant})` : finalName;
    showToast(`✓ ${displayMsg} added to cart!`);
}

// ============================================
// CART MANIPULATION FUNCTIONS
// ============================================

function updateQuantity(key, change) {
    const item = cart.items.find(item => item.key === key);
    if (item) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) {
            removeItem(key);
        } else {
            item.quantity = newQuantity;
            updateCartTotals();
            saveCart();
            updateCartUI();
        }
    }
}

function removeItem(key) {
    cart.items = cart.items.filter(item => item.key !== key);
    updateCartTotals();
    saveCart();
    updateCartUI();
}

function clearCart() {
    cart = { items: [], total: 0 };
    saveCart();
    updateCartUI();
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateCartCount() {
    const count = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = count;
        cartCountEl.style.display = count > 0 ? 'flex' : 'none';
    }
}

function updateCartUI() {
    updateCartCount();
    
    const cartItemsEl = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    if (!cartItemsEl) return;
    
    updateCartTotals();
    
    if (cart.items.length === 0) {
        cartItemsEl.innerHTML = `
            <div class="empty-cart" style="text-align:center;padding:40px 20px;color:#888;">
                <i class="fas fa-shopping-bag" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                Your cart is empty
            </div>
        `;
        if (cartTotalEl) cartTotalEl.textContent = '₦0';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }
    
    let html = '';
    cart.items.forEach((item) => {
        const price = item.price || 0;
        const displayName = item.displayName || (item.variant ? `${item.name} (${item.variant})` : item.name);
        html += `
            <div class="cart-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.1);">
                <div class="cart-item-info" style="flex:1;min-width:0;">
                    <div class="cart-item-name" style="font-weight:600;margin-bottom:4px;word-wrap:break-word;font-size:0.95rem;">${displayName}</div>
                    <div class="cart-item-price" style="font-size:0.85rem;color:#ff9800;">₦${price.toLocaleString()}</div>
                </div>
                <div class="cart-item-actions" style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
                    <button onclick="updateQuantity('${item.key}', -1)" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,152,0,0.5);background:rgba(255,255,255,0.1);color:white;cursor:pointer;font-weight:bold;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">−</button>
                    <span class="cart-item-quantity" style="min-width:30px;text-align:center;font-weight:bold;font-size:1rem;">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.key}', 1)" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,152,0,0.5);background:rgba(255,255,255,0.1);color:white;cursor:pointer;font-weight:bold;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">+</button>
                    <button onclick="removeItem('${item.key}')" style="background:rgba(231,76,60,0.2);color:#e74c3c;border:1px solid #e74c3c;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.9rem;">×</button>
                </div>
            </div>
        `;
    });
    
    cartItemsEl.innerHTML = html;
    
    if (cartTotalEl) cartTotalEl.textContent = `₦${cart.total.toLocaleString()}`;
    if (checkoutBtn) checkoutBtn.disabled = false;
}

// ============================================
// CART SIDEBAR TOGGLE
// ============================================

function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    if (!sidebar) return;
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateCartUI();
        setTimeout(() => {
            const cartItems = document.getElementById('cart-items');
            if (cartItems) {
                cartItems.scrollTop = cartItems.scrollHeight;
            }
        }, 300);
    }
}

// ============================================
// CHECKOUT
// ============================================

function proceedToCheckout() {
    if (cart.items.length === 0) {
        showToast('Your cart is empty! Please add items first.');
        return;
    }
    saveCart();
    window.location.href = 'checkout.html';
}

// ============================================
// TOAST NOTIFICATION
// ============================================

function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#e74c3c' : 'linear-gradient(135deg, #25D366, #128C7E)'};
        color: white;
        padding: 12px 25px;
        border-radius: 30px;
        font-weight: bold;
        font-size: 0.9rem;
        z-index: 2000;
        box-shadow: 0 5px 20px rgba(0,0,0,0.4);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        opacity: 0;
        transition: opacity 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = '1'; }, 50);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ============================================
// MENU ITEM BUTTON GENERATION - FIXED
// ============================================

function getItemVariants(menuItemEl) {
    const variants = [];
    const variantBtns = menuItemEl.querySelectorAll('.variant-btn');
    variantBtns.forEach(btn => {
        const priceMatch = btn.textContent.match(/₦([\d,]+)/);
        if (priceMatch) {
            // Extract variant text (everything before "– ₦")
            const text = btn.textContent.trim();
            const variantMatch = text.match(/^(.+?)\s*–\s*₦/);
            const variantText = variantMatch ? variantMatch[1].trim() : text;
            variants.push({
                text: text,
                variant: variantText,
                price: parseInt(priceMatch[1].replace(/,/g, ''))
            });
        }
    });
    return variants;
}

function getSimplePrice(menuItemEl) {
    const priceEl = menuItemEl.querySelector('.item-price');
    if (priceEl) {
        let priceText = priceEl.textContent;
        let match = priceText.match(/[#₦]?([\d,]+)/);
        if (match) {
            return parseInt(match[1].replace(/,/g, ''));
        }
    }
    return 0;
}

function openWhatsAppChat(itemName) {
    const whatsappNumber = '2348105442629';
    const message = `Hello UrbanCity! 👋\n\nI'm interested in *${itemName}*.\n\nPlease let me know the price and available options.\n\nThank you!`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// ============================================
// ADD TO CART BUTTONS - FIXED
// ============================================

function addAddToCartButtonsToMenu() {
    setTimeout(function() {
        var menuItems = document.querySelectorAll('.menu-item');
        console.log('🔍 Adding cart buttons to', menuItems.length, 'menu items');
        
        for (var i = 0; i < menuItems.length; i++) {
            var menuItemEl = menuItems[i];
            
            var itemId = menuItemEl.dataset.id;
            if (!itemId) {
                console.warn('⚠️ Menu item has no data-id:', menuItemEl);
                continue;
            }
            
            if (menuItemEl.querySelector('.add-to-cart-btn') || menuItemEl.querySelector('.chat-to-order-btn')) {
                continue;
            }
            
            var titleEl = menuItemEl.querySelector('.item-title');
            var fullItemName = titleEl ? titleEl.textContent.trim() : 'Item';
            
            var isUnavailable = menuItemEl.classList.contains('unavailable-item') || 
                                menuItemEl.querySelector('.unavailable-overlay') !== null ||
                                menuItemEl.querySelector('.unavailable-badge') !== null;
            
            var variants = getItemVariants(menuItemEl);
            var simplePrice = getSimplePrice(menuItemEl);
            
            var footer = menuItemEl.querySelector('.item-footer');
            if (!footer) continue;
            
            var buttonContainer = footer.querySelector('.button-container');
            if (!buttonContainer) {
                buttonContainer = document.createElement('div');
                buttonContainer.className = 'button-container';
                footer.appendChild(buttonContainer);
            }
            
            if (isUnavailable) {
                buttonContainer.innerHTML = `
                    <button class="add-to-cart-btn" disabled style="background: #666; cursor: not-allowed; opacity: 0.6;">
                        <i class="fas fa-times-circle"></i> Currently Unavailable
                    </button>
                `;
                continue;
            }
            
            // Case 1: Has variants
            if (variants.length > 0) {
                var variantsHtml = '';
                for (var v = 0; v < variants.length; v++) {
                    var isSelected = v === 0 ? 'selected' : '';
                    var price = variants[v].price || 0;
                    var variantText = variants[v].variant || variants[v].text.replace(/"/g, '&quot;');
                    var displayText = variants[v].text.replace(/"/g, '&quot;');
                    variantsHtml += `<button class="variant-btn ${isSelected}" data-price="${price}" data-variant="${variantText}" data-display="${displayText}">${displayText}</button>`;
                }
                
                var initialPrice = variants[0]?.price || 0;
                var initialVariant = variants[0]?.variant || '';
                var initialDisplay = variants[0]?.text || '';
                
                buttonContainer.innerHTML = `
                    <div class="variant-selector" id="variant-${itemId}">
                        ${variantsHtml}
                    </div>
                    <button class="add-to-cart-btn" data-id="${itemId}" data-name="${fullItemName}" data-price="${initialPrice}" data-variant="${initialVariant}" data-display="${initialDisplay}">
                        <i class="fas fa-plus"></i> Add to Cart
                    </button>
                `;
                
                var variantBtns = buttonContainer.querySelectorAll('.variant-btn');
                var addBtn = buttonContainer.querySelector('.add-to-cart-btn');
                
                for (var v = 0; v < variantBtns.length; v++) {
                    var btn = variantBtns[v];
                    btn.addEventListener('click', (function(b) {
                        return function() {
                            var btns = b.parentElement.querySelectorAll('.variant-btn');
                            for (var j = 0; j < btns.length; j++) {
                                btns[j].classList.remove('selected');
                            }
                            b.classList.add('selected');
                            var addButton = b.parentElement.parentElement.querySelector('.add-to-cart-btn');
                            var price = parseInt(b.dataset.price);
                            var variant = b.dataset.variant;
                            var display = b.dataset.display;
                            addButton.dataset.price = price;
                            addButton.dataset.variant = variant;
                            addButton.dataset.display = display;
                            console.log('🔘 Variant selected:', { price, variant, display });
                        };
                    })(btn));
                }
                
                addBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var id = this.dataset.id;
                    var name = this.dataset.name;
                    var priceVal = parseInt(this.dataset.price);
                    var variant = this.dataset.variant || null;
                    var display = this.dataset.display || '';
                    console.log('🛒 Add button clicked:', { id, name, priceVal, variant, display });
                    if (priceVal > 0) {
                        // Pass the variant name to addToCart
                        addToCart(id, name, priceVal, variant);
                    } else {
                        showToast('Please select a valid option');
                    }
                });
            }
            // Case 2: Simple price
            else if (simplePrice > 0) {
                buttonContainer.innerHTML = `
                    <button class="add-to-cart-btn" data-id="${itemId}" data-name="${fullItemName}" data-price="${simplePrice}">
                        <i class="fas fa-plus"></i> Add to Cart
                    </button>
                `;
                
                var addBtn = buttonContainer.querySelector('.add-to-cart-btn');
                addBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var id = this.dataset.id;
                    var name = this.dataset.name;
                    var priceVal = parseInt(this.dataset.price);
                    console.log('🛒 Add button clicked:', { id, name, priceVal });
                    if (priceVal > 0) {
                        addToCart(id, name, priceVal, null);
                    } else {
                        showToast('Price not available');
                    }
                });
            }
            // Case 3: Market price - Chat to Order
            else {
                var priceDisplayEl = menuItemEl.querySelector('.item-price');
                var priceDisplay = priceDisplayEl ? priceDisplayEl.textContent : '';
                if (priceDisplay && (priceDisplay.includes('Market') || priceDisplay.includes('varies') || priceDisplay.includes('Price'))) {
                    buttonContainer.innerHTML = `
                        <button class="chat-to-order-btn" onclick="openWhatsAppChat('${fullItemName.replace(/'/g, "\\'")}')">
                            <i class="fab fa-whatsapp"></i> Chat to Order
                        </button>
                    `;
                }
            }
        }
    }, 500);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Initializing cart system...');
    
    window.addToCart = addToCart;
    window.updateQuantity = updateQuantity;
    window.removeItem = removeItem;
    window.toggleCart = toggleCart;
    window.proceedToCheckout = proceedToCheckout;
    window.clearCart = clearCart;
    window.openWhatsAppChat = openWhatsAppChat;
    window.showToast = showToast;
    
    try {
        const saved = localStorage.getItem('urbancity_cart');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.items && parsed.items.some(item => item.name === null || item.price === undefined)) {
                console.warn('⚠️ Corrupted cart data found, clearing...');
                localStorage.removeItem('urbancity_cart');
            }
        }
    } catch (e) {
        localStorage.removeItem('urbancity_cart');
    }
    
    loadCart();
    updateCartUI();
    
    var observer = new MutationObserver(function() {
        addAddToCartButtonsToMenu();
    });
    var menuCategories = document.getElementById('menuCategories');
    if (menuCategories) {
        observer.observe(menuCategories, { childList: true, subtree: true });
    }
    addAddToCartButtonsToMenu();
    
    console.log('✅ Cart system initialized with', cart.items.length, 'items');
});