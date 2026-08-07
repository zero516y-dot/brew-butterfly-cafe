
(function(window){
  "use strict";

  var LEGACY_KEYS = [
    "bbc_menu_items_v3",
    "bbc_reservations_v3",
    "bbc_categories_v3",
    "bbc_settings_v3"
  ];

  // One-time cleanup: remove keys written by older builds of this page.
  // This only deletes stale data; nothing is rewritten into storage.
  function clearLegacyStorage(){
    try {
      LEGACY_KEYS.forEach(function(key){
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) { /* storage unavailable */ }
  }

  function seed(){
    var base = window.DEFAULT_CAFE_DATA || {};
    return {
      menu: (base.menuItems || []).map(function(item){ return Object.assign({}, item); }),
      categories: (base.categories || []).slice(),
      reservations: []
    };
  }

  var Store = {
    data: seed(),

    init: function(){
      clearLegacyStorage();
      this.data = seed();
    },

    // Categories
    getCategories: function(){
      return this.data.categories.slice();
    },

    // Menu CRUD
    getMenu: function(){
      return this.data.menu.map(function(item){ return Object.assign({}, item); });
    },

    getMenuItemById: function(id){
      return this.data.menu.find(function(item){ return item.id === id; });
    },

    saveMenuItem: function(item){
      var menu = this.data.menu;
      if (!item.id) {
        item.id = "m-" + Date.now();
      }
      var existingIndex = menu.findIndex(function(m){ return m.id === item.id; });
      if (existingIndex >= 0) {
        menu[existingIndex] = Object.assign({}, menu[existingIndex], item);
      } else {
        menu.unshift(item);
      }
      this.notifyChange();
      return item;
    },

    toggleStock: function(id){
      var item = this.data.menu.find(function(m){ return m.id === id; });
      if (item) {
        item.inStock = !item.inStock;
        this.notifyChange();
      }
      return item;
    },

    deleteMenuItem: function(id){
      this.data.menu = this.data.menu.filter(function(item){ return item.id !== id; });
      this.notifyChange();
      return true;
    },

    // Reservations Management (in-memory preview only; live data lives on the backend)
    getReservations: function(){
      return this.data.reservations.slice();
    },

    addReservation: function(resData){
      var ref = 'BBC-' + Math.floor(100000 + Math.random()*900000);
      var newRes = Object.assign({
        id: ref,
        status: "Pending",
        created: new Date().toISOString().split('T')[0]
      }, resData);
      this.data.reservations.unshift(newRes);
      this.notifyChange();
      return newRes;
    },

    updateReservationStatus: function(id, newStatus){
      var item = this.data.reservations.find(function(r){ return r.id === id; });
      if (item) {
        item.status = newStatus;
        this.notifyChange();
      }
      return item;
    },

    deleteReservation: function(id){
      this.data.reservations = this.data.reservations.filter(function(r){ return r.id !== id; });
      this.notifyChange();
      return true;
    },

    // Reset to defaults
    resetDefaults: function(){
      this.data = seed();
      this.notifyChange();
    },

    notifyChange: function(){
      window.dispatchEvent(new Event("cafe_store_updated"));
    }
  };

  Store.init();
  window.CafeStore = Store;
})(window);
