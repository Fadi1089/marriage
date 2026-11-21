// ─────────────────────────────────────────────────────────────
//  EDIT THIS FILE — everything the couple may need to change.
// ─────────────────────────────────────────────────────────────
window.CONFIG = {
  // Google Apps Script web-app URL (see README → "Connect the form").
  // Until this is filled in, the form shows an error instead of sending.
  scriptUrl: "https://script.google.com/macros/s/AKfycbx5Eerw7YI1ooxkMBGv2-kK2WxaTk0CYjuAPB0qxW3FHJuInmz9uFpwfaDLSKprmKG5/exec",

  // Cagnotte link (Leetchi, Lydia/Sumeria, PayPal…). Leave "" to hide the button.
  cagnotteUrl: "",

  // Optional bank transfer instead of / next to the cagnotte. Leave "" to hide.
  iban: "",
  ibanHolder: "Lynn & Fadi",

  // RSVP deadline (shown in all languages via i18n.js)
  deadline: "2027-01-15",

  places: {
    glamping: {
      url: "https://www.glamping-resorts.de/",
      book: "https://onepagebooking.com/glamping?lang=de",
      images: [
        "https://www.glamping-resorts.de/wp-content/uploads/2018/05/waldgarten-glamping-resorts-biosphaere-bliesgau-04-1024x683.jpg",
        "https://www.glamping-resorts.de/wp-content/uploads/2017/09/glamping-resorts-natur-hotelzimmer-innenansicht-xl.jpg"
      ],
      credit: "glamping-resorts.de"
    },
    hotel: {
      name: "Le Marrakech Boutique Hotel",
      url: "https://www.marrakech-hotel.de/",
      book: "https://www.marrakech-hotel.de/buchen.html",
      images: [
        "https://static.only-inside-s2.de/clients/client_58/marrakech_boutique_hotel_pr-8-1920x1280-le-marrakech-boutique-hotel_ee4142a358602b1e2c3bb3d8e6b4f9a1.webp",
        "https://static.only-inside-s2.de/clients/client_58/z80_1840_rgb_web-1600x1067-le-marrakech-boutique-hotel_6cb3477561decc2be5f26c84c2a8cd63.webp"
      ],
      credit: "marrakech-hotel.de"
    }
  }
};
