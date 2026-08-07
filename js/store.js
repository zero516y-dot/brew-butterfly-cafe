/* Brew Butterfly Cafe - Central LocalStorage Store Engine */
(function(window){
  "use strict";

  var STORE_KEY_MENU = "bbc_menu_items_v3";
  var STORE_KEY_RES = "bbc_reservations_v3";
  var STORE_KEY_CATEGORIES = "bbc_categories_v3";
  var STORE_KEY_SETTINGS = "bbc_settings_v3";

  var Store = {
    // Initialize data if not already present
    init: function(){
      if (!localStorage.getItem(STORE_KEY_MENU)) {
        localStorage.setItem(STORE_KEY_MENU, JSON.stringify(window.DEFAULT_CAFE_DATA.menuItems));
      }
      if (!localStorage.getItem(STORE_KEY_RES)) {
        localStorage.setItem(STORE_KEY_RES, JSON.stringify(window.DEFAULT_CAFE_DATA.sampleReservations));
      }
      if (!localStorage.getItem(STORE_KEY_CATEGORIES)) {
        localStorage.setItem(STORE_KEY_CATEGORIES, JSON.stringify(window.DEFAULT_CAFE_DATA.categories));
      }
      if (!localStorage.getItem(STORE_KEY_SETTINGS)) {
        localStorage.setItem(STORE_KEY_SETTINGS, JSON.stringify({
          ownerEmail: "brewbutterflycafe@gmail.com",
          notifyViaEmail: true,
          web3formsAccessKey: "YOUR_ACCESS_KEY"
        }));
      }
    },

    // Settings
    getSettings: function(){
      this.init();
      return JSON.parse(localStorage.getItem(STORE_KEY_SETTINGS)) || {};
    },

    saveSettings: function(newSettings){
      var current = this.getSettings();
      var updated = Object.assign({}, current, newSettings);
      localStorage.setItem(STORE_KEY_SETTINGS, JSON.stringify(updated));
      this.notifyChange();
      return updated;
    },

    // Categories
    getCategories: function(){
      this.init();
      return JSON.parse(localStorage.getItem(STORE_KEY_CATEGORIES)) || [];
    },

    // Menu CRUD
    getMenu: function(){
      this.init();
      return JSON.parse(localStorage.getItem(STORE_KEY_MENU)) || [];
    },

    getMenuItemById: function(id){
      var menu = this.getMenu();
      return menu.find(function(item){ return item.id === id; });
    },

    saveMenuItem: function(item){
      var menu = this.getMenu();
      if (!item.id) {
        item.id = "m-" + Date.now();
      }
      var existingIndex = menu.findIndex(function(m){ return m.id === item.id; });
      if (existingIndex >= 0) {
        menu[existingIndex] = Object.assign({}, menu[existingIndex], item);
      } else {
        menu.unshift(item);
      }
      localStorage.setItem(STORE_KEY_MENU, JSON.stringify(menu));
      this.notifyChange();
      return item;
    },

    toggleStock: function(id){
      var menu = this.getMenu();
      var item = menu.find(function(m){ return m.id === id; });
      if(item){
        item.inStock = !item.inStock;
        localStorage.setItem(STORE_KEY_MENU, JSON.stringify(menu));
        this.notifyChange();
      }
      return item;
    },

    deleteMenuItem: function(id){
      var menu = this.getMenu();
      menu = menu.filter(function(item){ return item.id !== id; });
      localStorage.setItem(STORE_KEY_MENU, JSON.stringify(menu));
      this.notifyChange();
      return true;
    },

    // Reservations Management
    getReservations: function(){
      this.init();
      return JSON.parse(localStorage.getItem(STORE_KEY_RES)) || [];
    },

    addReservation: function(resData){
      var reservations = this.getReservations();
      var ref = 'BBC-' + Math.floor(100000 + Math.random()*900000);
      var newRes = Object.assign({
        id: ref,
        status: "Pending",
        created: new Date().toISOString().split('T')[0]
      }, resData);
      reservations.unshift(newRes);
      localStorage.setItem(STORE_KEY_RES, JSON.stringify(reservations));
      this.notifyChange();
      return newRes;
    },

    updateReservationStatus: function(id, newStatus){
      var res = this.getReservations();
      var item = res.find(function(r){ return r.id === id; });
      if (item) {
        item.status = newStatus;
        localStorage.setItem(STORE_KEY_RES, JSON.stringify(res));
        this.notifyChange();
      }
      return item;
    },

    deleteReservation: function(id){
      var res = this.getReservations();
      res = res.filter(function(r){ return r.id !== id; });
      localStorage.setItem(STORE_KEY_RES, JSON.stringify(res));
      this.notifyChange();
      return true;
    },

    // Reset to defaults
    resetDefaults: function(){
      localStorage.setItem(STORE_KEY_MENU, JSON.stringify(window.DEFAULT_CAFE_DATA.menuItems));
      localStorage.setItem(STORE_KEY_RES, JSON.stringify(window.DEFAULT_CAFE_DATA.sampleReservations));
      localStorage.setItem(STORE_KEY_CATEGORIES, JSON.stringify(window.DEFAULT_CAFE_DATA.categories));
      this.notifyChange();
    },

    notifyChange: function(){
      window.dispatchEvent(new Event("cafe_store_updated"));
    }
  };

  Store.init();
  window.CafeStore = Store;
})(window);
