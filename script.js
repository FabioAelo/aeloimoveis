* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: "DM Sans", Arial, sans-serif;
  color: #18202b;
  background: #fff;
}

a {
  text-decoration: none;
  color: inherit;
}

.container {
  width: min(1180px, 92%);
  margin: auto;
}

/* CABEÇALHO */
.header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  color: #fff;
}

.nav {
  min-height: 96px;
  display: flex;
  align-items: center;
  gap: 32px;
  border-bottom: 1px solid rgba(255,255,255,.18);
}

.logo {
  display: flex;
  align-items: center;
  margin-right: auto;
  flex-shrink: 0;
}

.logo img {
  display: block;
  width: 145px;
  height: 76px;
  object-fit: contain;
  object-position: center;
}

.nav nav {
  display: flex;
  gap: 28px;
  font-size: 14px;
}

.nav nav a:hover {
  opacity: .7;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 23px;
  border: 0;
  border-radius: 4px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.btn-outline {
  border: 1px solid rgba(255,255,255,.55);
  color: #fff;
}

.btn-gold {
  background: #c6a15b;
  color: #fff;
}

.btn-dark {
  background: #18202b;
  color: #fff;
}

.menu {
  display: none;
  background: none;
  border: 0;
  color: #fff;
  font-size: 25px;
}

.announce-nav {
  display: block;
  width: min(1180px, 92%);
  margin: 10px auto 0;
  text-align: right;
  color: #e0b65b;
  font-size: 12px;
  font-weight: 700;
}

/* HERO */
.hero {
  min-height: 720px;
  display: flex;
  align-items: center;
  position: relative;
  background: linear-gradient(115deg, #03101f, #0a1b30 60%, #16344d);
  color: #fff;
  overflow: hidden;
}

.hero:after {
  content: "";
  position: absolute;
  width: 620px;
  height: 620px;
  right: -140px;
  top: -20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(218,174,72,.20), transparent 68%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(3,16,31,.25), rgba(3,16,31,.05));
}

.hero-content {
  position: relative;
  z-index: 2;
  padding-top: 100px;
}

.eyebrow {
  color: #dcb15a;
  letter-spacing: 3px;
  font-size: 10px;
  font-weight: 700;
  margin: 0 0 18px;
}

.eyebrow.dark {
  color: #a88343;
}

.hero h1 {
  font: 600 clamp(46px, 6vw, 76px)/1.05 "Playfair Display", serif;
  max-width: 780px;
  margin: 18px 0;
}

.hero h1 em {
  color: #e0b65b;
  font-weight: 600;
}

.hero-text {
  max-width: 600px;
  color: #c5ced8;
  font-size: 17px;
  line-height: 1.7;
}

/* BUSCA */
.search-card {
  margin-top: 40px;
  background: #fff;
  color: #18202b;
  padding: 20px;
  box-shadow: 0 22px 55px rgba(0,0,0,.22);
  max-width: 1100px;
  border-radius: 6px;
}

.search-tabs {
  display: flex;
  gap: 25px;
  border-bottom: 1px solid #ddd;
  margin-bottom: 18px;
}

.search-tabs button {
  background: none;
  border: 0;
  padding: 0 4px 13px;
  font-weight: 700;
  color: #777;
  cursor: pointer;
}

.search-tabs .active {
  color: #a88343;
  border-bottom: 2px solid #a88343;
}

.search-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr auto;
  gap: 12px;
}

.search-grid label {
  font-size: 11px;
  color: #777;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.search-grid input,
.search-grid select,
form input,
form select,
form textarea {
  border: 1px solid #ddd;
  padding: 14px;
  background: #fff;
  font: inherit;
  color: #333;
  border-radius: 3px;
}

.search-btn {
  min-width: 150px;
  align-self: end;
}

/* SEÇÕES */
.section {
  padding: 90px 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 35px;
}

.section-head h2,
.about h2,
.contact h2 {
  font: 700 42px/1.1 "Playfair Display", serif;
  margin: 0;
}

.text-link {
  font-weight: 700;
  color: #a88343;
}

/* IMÓVEIS */
.property-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 25px;
}

.property {
  border: 1px solid #e7e7e7;
  background: #fff;
  transition: .2s;
}

.property:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 35px rgba(0,0,0,.07);
}

.property-img {
  height: 220px;
  background: linear-gradient(135deg, #b6b7b2, #64747c);
  position: relative;
}

.tag {
  position: absolute;
  top: 15px;
  left: 15px;
  background: #18202b;
  color: #fff;
  padding: 7px 10px;
  font-size: 10px;
  font-weight: 800;
}

.property-body {
  padding: 20px;
}

.property h3 {
  margin: 0 0 8px;
  font-size: 19px;
}

.property p {
  margin: 0 0 14px;
  color: #777;
  font-size: 13px;
}

.features {
  display: flex;
  gap: 15px;
  color: #555;
  font-size: 12px;
  border-top: 1px solid #eee;
  padding-top: 14px;
}

.price {
  font-size: 21px;
  font-weight: 800;
  margin-top: 15px;
}

/* SERVIÇOS */
.services {
  background: #182431;
  color: #fff;
  padding: 90px 0;
}

.light h2 {
  color: #fff;
}

.service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: rgba(255,255,255,.10);
}

.service-grid article {
  padding: 30px;
  background: #182431;
  min-height: 250px;
}

.icon {
  font-size: 30px;
  color: #c6a15b;
  margin-bottom: 25px;
}

.service-grid h3 {
  font-size: 20px;
}

.service-grid p {
  color: #aeb8c0;
  line-height: 1.7;
  font-size: 14px;
}

.service-grid a {
  color: #d8bc7c;
  font-size: 13px;
  font-weight: 700;
}

/* SOBRE */
.about {
  padding: 100px 0;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.about-photo {
  min-height: 480px;
  background: linear-gradient(135deg, #8c9a9d, #263643 70%, #c0a36c);
  position: relative;
}

.about-photo:after {
  content: "AELO";
  position: absolute;
  right: 25px;
  bottom: 20px;
  font: 700 70px "Playfair Display";
  color: rgba(255,255,255,.18);
}

.about p:not(.eyebrow) {
  color: #69737d;
  line-height: 1.8;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin: 35px 0;
}

.stats div {
  border-left: 2px solid #c6a15b;
  padding-left: 12px;
}

.stats strong {
  display: block;
  font-size: 25px;
}

.stats span {
  font-size: 11px;
  color: #777;
}

/* CTA */
.cta {
  background: #f4f0e8;
  padding: 60px 0;
}

.cta-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
}

.cta h2 {
  font: 700 36px "Playfair Display", serif;
  margin: 0;
  max-width: 700px;
}

/* ANUNCIE */
.announce-section {
  background: #faf9f6;
  padding: 105px max(4%, calc((100% - 1160px)/2));
  display: grid;
  grid-template-columns: 1fr 440px;
  gap: 80px;
  align-items: center;
}

.announce-section h2 {
  font: 600 43px/1.1 "Playfair Display", serif;
  max-width: 600px;
}

.announce-section p {
  color: #69737e;
  line-height: 1.8;
}

.announce-section ul {
  padding: 0;
  list-style: none;
  color: #59636e;
  line-height: 2.1;
  font-size: 13px;
}

.announce-section li:before {
  content: "✓";
  color: #a87929;
  margin-right: 9px;
}

.owner-form {
  background: #fff;
  border: 1px solid #e0e3e6;
  border-radius: 6px;
  padding: 24px;
  display: grid;
  gap: 10px;
  box-shadow: 0 15px 35px rgba(0,0,0,.07);
}

.owner-form input,
.owner-form select,
.owner-form textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #dfe2e5;
  border-radius: 4px;
  font: 13px "DM Sans", sans-serif;
}

.premium-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 13px 21px;
  border: 0;
  border-radius: 4px;
  background: #d9ad4b;
  color: #0b1724;
  text-decoration: none;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
}

/* CONTATO */
.contact {
  padding: 90px 0;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 90px;
}

.contact p:not(.eyebrow) {
  color: #69737d;
  line-height: 1.7;
}

.contact-info {
  margin: 25px 0;
  padding: 20px 0;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
}

.contact-info p {
  margin: 0 0 15px;
}

.contact-info p:last-child {
  margin-bottom: 0;
}

.contact-info strong {
  color: #18202b;
}

.contact-info a {
  color: #a88343;
  font-weight: 700;
}

.whatsapp {
  display: inline-block;
  margin-top: 15px;
  font-weight: 800;
  color: #a88343;
}

/* RODAPÉ */
.premium-footer {
  background: #050e19;
  color: #9aa5b1;
  padding: 30px 4%;
  font-size: 11px;
}

.footer-inner {
  width: min(1160px, 100%);
  margin: auto;
  display: grid;
  grid-template-columns: 150px 1fr 1fr auto;
  gap: 30px;
  align-items: center;
}

.premium-footer img {
  display: block;
  width: 140px;
  height: 80px;
  object-fit: contain;
}

.footer-inner strong {
  display: block;
  color: #fff;
  font-size: 13px;
  margin-bottom: 6px;
}

.footer-inner span {
  display: block;
  line-height: 1.8;
}

.footer-copy {
  text-align: right;
  white-space: nowrap;
}

/* WHATSAPP FLUTUANTE */
.float-whatsapp {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #1eae61;
  color: #fff;
  font-size: 27px;
  box-shadow: 0 8px 25px rgba(0,0,0,.20);
  z-index: 20;
}

/* RESPONSIVO */
@media (max-width: 900px) {
  .nav {
    min-height: 88px;
  }

  .nav nav,
  .nav > .btn {
    display: none;
  }

  .menu {
    display: block;
  }

  .announce-nav {
    display: none;
  }

  .search-grid {
    grid-template-columns: 1fr 1fr;
  }

  .property-grid,
  .service-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .about-grid,
  .contact-grid,
  .announce-section {
    grid-template-columns: 1fr;
  }

  .announce-section {
    gap: 45px;
  }

  .footer-inner {
    grid-template-columns: 1fr 1fr;
  }

  .footer-copy {
    text-align: left;
  }
}

@media (max-width: 600px) {
  .logo img {
    width: 125px;
    height: 70px;
  }

  .hero {
    min-height: 800px;
  }

  .hero-content {
    padding-top: 105px;
  }

  .hero h1 {
    font-size: 43px;
  }

  .hero-text {
    font-size: 15px;
  }

  .search-grid,
  .property-grid,
  .service-grid {
    grid-template-columns: 1fr;
  }

  .section-head,
  .cta-inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .about {
    padding: 75px 0;
  }

  .about-photo {
    min-height: 300px;
  }

  .stats {
    grid-template-columns: 1fr;
  }

  .section-head h2,
  .about h2,
  .contact h2 {
    font-size: 34px;
  }

  .announce-section {
    padding: 80px 6%;
  }

  .announce-section h2 {
    font-size: 35px;
  }

  .contact {
    padding: 75px 0;
  }

  .footer-inner {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .footer-copy {
    white-space: normal;
  }
}
