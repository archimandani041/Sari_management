/**
 * LandingPage.jsx
 * Public luxury landing page for KP Creation.
 * Redesigned with clear section-by-section flow inspired by testdino.com.
 *
 * Sections:
 * 1. Navbar  2. Centered Hero  3. Social Proof  4. Features (4 blocks)
 * 5. How It Works  6. Testimonials  7. Pricing  8. FAQ  9. Final CTA  10. Footer
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/* ─── Injected luxury animations & styles ─────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes floatOrb {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.18; }
    33%      { transform: translate(25px, -35px) scale(1.1); opacity: 0.28; }
    66%      { transform: translate(-20px, -55px) scale(0.9); opacity: 0.15; }
  }
  @keyframes floatOrb2 {
    0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.14; }
    50%      { transform: translate(-30px, -45px) scale(1.2); opacity: 0.25; }
  }
  @keyframes heroFadeUp {
    from { opacity: 0; transform: translateY(35px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes heroFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes navReveal {
    from { opacity: 0; transform: translateY(-25px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes sareeFloat {
    0%   { transform: translateY(0px) rotate(-1.5deg) scale(1); }
    20%  { transform: translateY(-16px) rotate(0deg) scale(1.01); }
    45%  { transform: translateY(-26px) rotate(1.5deg) scale(1.02); }
    70%  { transform: translateY(-10px) rotate(-0.5deg) scale(1.005); }
    100% { transform: translateY(0px) rotate(-1.5deg) scale(1); }
  }
  @keyframes sareeShimmer {
    0%   { opacity: 0; left: -25%; }
    30%  { opacity: 0.9; }
    100% { opacity: 0; left: 120%; }
  }
  @keyframes sareeGlow {
    0%, 100% { opacity: 0.45; transform: scale(1); }
    50%      { opacity: 0.85; transform: scale(1.08); }
  }
  @keyframes sareeEntrance {
    from { opacity: 0; transform: translateY(40px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(194, 24, 91, 0.35); }
    50%      { box-shadow: 0 0 45px rgba(194, 24, 91, 0.7); }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.92) translateY(20px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes sectionReveal {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lp-root {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    background: #15060D;
    color: #FDF2F3;
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }
  .lp-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(45px);
  }
  .lp-orb-1 {
    width: 520px; height: 520px;
    background: radial-gradient(circle, rgba(139, 26, 58, 0.4), transparent 70%);
    top: -120px; right: 0;
    animation: floatOrb 14s ease-in-out infinite;
  }
  .lp-orb-2 {
    width: 380px; height: 380px;
    background: radial-gradient(circle, rgba(194, 24, 91, 0.2), transparent 70%);
    bottom: 120px; left: 4%;
    animation: floatOrb2 18s ease-in-out infinite;
  }
  .lp-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    padding: 14px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, rgba(21, 6, 13, 0.95) 0%, rgba(21, 6, 13, 0.85) 70%, transparent 100%);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(212, 175, 55, 0.12);
    animation: navReveal 0.8s ease-out both;
  }
  .lp-btn-primary {
    background: linear-gradient(135deg, #8B1A3A 0%, #C2185B 50%, #8B1A3A 100%);
    background-size: 200% auto;
    color: #FDF2F3;
    border: none;
    padding: 14px 32px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.4px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    font-family: inherit;
  }
  .lp-btn-primary:hover {
    background-position: right center;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(194, 24, 91, 0.45);
  }
  .lp-btn-secondary {
    background: rgba(253, 242, 243, 0.04);
    color: #FDF2F3;
    border: 1.5px solid rgba(253, 242, 243, 0.35);
    padding: 13px 30px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(8px);
    font-family: inherit;
  }
  .lp-btn-secondary:hover {
    background: rgba(253, 242, 243, 0.12);
    border-color: rgba(253, 242, 243, 0.7);
    transform: translateY(-2px);
  }
  .lp-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(212, 175, 55, 0.1);
    border: 1px solid rgba(212, 175, 55, 0.28);
    color: #D4AF37;
    padding: 7px 18px;
    border-radius: 50px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.3px;
    backdrop-filter: blur(8px);
  }
  .lp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #D4AF37, #F5C842, #D4AF37, transparent);
    opacity: 0.3;
  }
  .lp-section {
    position: relative;
    z-index: 10;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 clamp(24px, 6vw, 80px);
  }
  .lp-pricing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 28px;
    max-width: 1080px;
    margin: 0 auto;
  }
  .lp-plan-card {
    position: relative;
    padding: 40px 32px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.03);
    border: 1.5px solid rgba(212, 175, 55, 0.18);
    backdrop-filter: blur(12px);
    transition: all 0.35s ease;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .lp-plan-card:hover {
    border-color: rgba(212, 175, 55, 0.5);
    background: rgba(212, 175, 55, 0.05);
    transform: translateY(-8px);
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.45);
  }
  .lp-plan-team {
    border-color: rgba(194, 24, 91, 0.6) !important;
    background: linear-gradient(180deg, rgba(139, 26, 58, 0.2) 0%, rgba(21, 6, 13, 0.6) 100%) !important;
    box-shadow: 0 15px 40px rgba(139, 26, 58, 0.25);
  }
  .lp-plan-badge {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #8B1A3A, #C2185B);
    color: #FDF2F3;
    padding: 5px 20px;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.6px;
    white-space: nowrap;
    box-shadow: 0 4px 15px rgba(194, 24, 91, 0.4);
  }
  .lp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 2, 6, 0.8);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .lp-modal-box {
    background: #1C0913;
    border: 1.5px solid rgba(212, 175, 55, 0.35);
    border-radius: 24px;
    padding: 36px;
    max-width: 520px;
    width: 100%;
    position: relative;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.8), 0 0 50px rgba(139, 26, 58, 0.35);
    animation: modalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .lp-form-input {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(212, 175, 55, 0.25);
    border-radius: 12px;
    color: #FDF2F3;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease;
    margin-bottom: 16px;
  }
  .lp-form-input:focus {
    border-color: #D4AF37;
    background: rgba(255, 255, 255, 0.09);
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
  }
  .lp-form-input::placeholder {
    color: rgba(253, 242, 243, 0.35);
  }
  .lp-form-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #D4AF37;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .lp-feature-block {
    display: flex;
    align-items: center;
    gap: clamp(32px, 5vw, 80px);
    padding: clamp(40px, 5vh, 72px) 0;
    border-bottom: 1px solid rgba(212, 175, 55, 0.1);
  }
  .lp-feature-block:last-child {
    border-bottom: none;
  }
  .lp-feature-content {
    flex: 1;
    min-width: 0;
  }
  .lp-feature-visual {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lp-feature-icon-box {
    width: 100%;
    max-width: 460px;
    aspect-ratio: 4 / 3;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba(139, 26, 58, 0.15) 0%, rgba(21, 6, 13, 0.4) 100%);
    border: 1px solid rgba(212, 175, 55, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .lp-feature-icon-box::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 20%, rgba(212, 175, 55, 0.04) 40%, rgba(245, 200, 66, 0.07) 50%, rgba(212, 175, 55, 0.04) 60%, transparent 80%);
    background-size: 200% auto;
    animation: shimmer 6s linear infinite;
  }
  .lp-faq-item {
    border: 1px solid rgba(212, 175, 55, 0.15);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s ease;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, 0.02);
  }
  .lp-faq-item:hover {
    border-color: rgba(212, 175, 55, 0.3);
  }
  .lp-faq-q {
    width: 100%;
    padding: 20px 24px;
    background: none;
    border: none;
    color: #FDF2F3;
    font-size: 16px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    font-family: inherit;
    transition: color 0.2s;
  }
  .lp-faq-q:hover {
    color: #D4AF37;
  }
  .lp-faq-a {
    padding: 0 24px 20px;
    color: rgba(253, 242, 243, 0.65);
    font-size: 15px;
    line-height: 1.7;
  }
  .lp-saree-hero-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 0;
    animation: sareeEntrance 1s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both;
  }
  .lp-saree-hero-glow {
    position: absolute;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(139, 26, 58, 0.5) 0%, rgba(212, 175, 55, 0.1) 45%, transparent 70%);
    animation: sareeGlow 5s ease-in-out infinite;
    filter: blur(35px);
  }
  .lp-saree-hero-img-wrap {
    position: relative;
    animation: sareeFloat 8s ease-in-out 1.5s infinite;
  }
  .lp-saree-hero-img {
    width: clamp(280px, 30vw, 420px);
    height: auto;
    object-fit: contain;
    border-radius: 16px;
    filter: drop-shadow(0 32px 64px rgba(139, 26, 58, 0.65)) drop-shadow(0 0 35px rgba(212, 175, 55, 0.25));
    mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%);
  }
  .lp-saree-hero-shimmer {
    position: absolute;
    top: 0; bottom: 0; width: 80px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: sareeShimmer 4.2s ease-in-out 2s infinite;
    pointer-events: none;
    border-radius: 16px;
  }
  .lp-saree-hero-frame {
    position: absolute;
    inset: -2px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.3), transparent 40%, rgba(212, 175, 55, 0.15) 80%, transparent);
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .lp-feature-block {
      flex-direction: column !important;
    }
    .lp-nav {
      padding: 12px 16px;
    }
    .lp-nav-center { display: none !important; }
  }
`;

/* ─── Check Mark ─────────────────────────────────────────────────────────── */
const CheckIcon = ({ gold }) => (
  <div style={{
    width: 20, height: 20, borderRadius: '50%',
    background: gold ? 'rgba(212, 175, 55, 0.15)' : 'rgba(194, 24, 91, 0.15)',
    color: gold ? '#D4AF37' : '#E03D72',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2,
    border: `1px solid ${gold ? 'rgba(212, 175, 55, 0.4)' : 'rgba(194, 24, 91, 0.4)'}`
  }}>
    &#10003;
  </div>
);

/* ─── Pricing Plans Definition ──────────────────────────────────────────── */
const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Single Loom / Boutique',
    price: '\u20b9249',
    period: '/month',
    desc: 'For independent saree boutiques & artisans managing exclusive collections.',
    features: [
      'Up to 500 Saree SKUs & combinations',
      'Live stock & shortage monitoring',
      'WhatsApp low-stock alerts',
      'Inventory movement history ledger',
      '1 Admin user seat',
      'Basic sales & stock analytics',
      'Standard community & email support',
    ],
    buttonText: 'Start Free Trial',
    buttonClass: 'pro',
  },
  {
    id: 'team',
    name: 'Team',
    subtitle: 'Multi-Loom & Showrooms',
    price: '\u20b9399',
    period: '/month',
    desc: 'For active saree brands, weaving cooperatives & fast-growing teams.',
    popular: true,
    features: [
      'Unlimited Saree designs & color series (A\u2192Z)',
      'AI demand forecasting (7d / 15d / 30d / 60d / 90d)',
      'WhatsApp supplier replenishment trigger',
      'Beam architecture & master weaver ledger',
      'Stock requests & approval workflow',
      'Multi-role access (Admin & Staff seats)',
      'Excel & PDF full ERP ledger exports',
      'Priority WhatsApp & phone support',
    ],
    buttonText: 'Get Started with Team',
    buttonClass: 'team',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Mills & Wholesale Houses',
    price: 'Custom',
    period: '',
    desc: 'For large textile manufacturers, wholesale distributors & multiple branches.',
    enterprise: true,
    features: [
      'All Team features included without limits',
      'Unlimited staff & master weaver accounts',
      'Multi-warehouse & loom location support',
      'Custom WhatsApp Business API integration',
      'Dedicated textile account manager',
      'Custom ERP, Tally & POS database sync',
      'Personalised onsite weaver onboarding',
      '99.9% uptime SLA with 24/7 dedicated support',
    ],
    buttonText: 'Contact Us',
    buttonClass: 'enterprise',
  },
];

/* ─── Feature Blocks Data ───────────────────────────────────────────────── */
const FEATURES = [
  {
    label: 'Inventory Management',
    title: 'Track every thread in your collection',
    desc: 'Real-time stock levels for every saree design, color combination, and series. Know exactly what\u2019s in stock, what\u2019s running low, and what needs reordering\u2014before it\u2019s too late.',
    points: ['Live stock & shortage monitoring', 'Full combination tracking (A\u2192Z series)', 'Inventory movement history ledger', 'Search & filter across 500+ SKUs'],
    icon: '\ud83d\udce6',
    iconBg: 'rgba(139, 26, 58, 0.2)',
  },
  {
    label: 'WhatsApp Integration',
    title: 'Alerts that reach your weavers instantly',
    desc: 'Low-stock notifications and supplier replenishment triggers delivered straight to WhatsApp. No emails to check, no portals to log into\u2014just instant action.',
    points: ['Automatic low-stock WhatsApp alerts', 'One-tap supplier reorder triggers', 'Staff & weaver group notifications', 'Custom alert thresholds per SKU'],
    icon: '\ud83d\udcac',
    iconBg: 'rgba(37, 211, 102, 0.12)',
  },
  {
    label: 'AI-Powered Analytics',
    title: 'Predict demand before it arrives',
    desc: 'Machine learning analyzes your sales patterns to forecast demand across 7, 15, 30, 60, and 90-day windows. Make stocking decisions backed by data, not guesswork.',
    points: ['Multi-window demand forecasting', 'Sales trend visualization', 'Supplier performance analytics', 'Exportable PDF & Excel reports'],
    icon: '\ud83e\udd16',
    iconBg: 'rgba(212, 175, 55, 0.15)',
  },
  {
    label: 'Team & Weaver Management',
    title: 'Coordinate your entire operation',
    desc: 'Multi-role access lets admins, staff, and master weavers each see what they need. Stock requests flow through approval workflows so nothing slips through.',
    points: ['Admin & staff role separation', 'Stock request approval workflows', 'Beam architecture & weaver ledger', 'Activity logs for full traceability'],
    icon: '\ud83d\udc65',
    iconBg: 'rgba(139, 26, 58, 0.2)',
  },
];

/* ─── FAQ Data ──────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'What types of saree businesses use KP Creation?',
    a: 'KP Creation is built for the entire handloom value chain\u2014from independent boutique artisans managing a few hundred designs, to multi-loom weaving cooperatives, showroom chains, and large wholesale textile houses.',
  },
  {
    q: 'How does the WhatsApp integration work?',
    a: 'When stock for any saree design or color combination drops below your configured threshold, KP Creation automatically sends a WhatsApp alert to the assigned contact\u2014whether that\u2019s your team, a supplier, or a master weaver. You can also trigger manual replenishment messages with one tap.',
  },
  {
    q: 'Can I manage multiple warehouse or loom locations?',
    a: 'Yes! The Enterprise plan supports multi-warehouse and multi-location management. Track stock independently across locations while seeing consolidated analytics in one dashboard.',
  },
  {
    q: 'What\u2019s included in the free trial?',
    a: 'Every plan comes with a full-featured 14-day free trial. No credit card required. You get access to all features of your chosen plan, and you can upgrade, downgrade, or cancel at any time.',
  },
  {
    q: 'How do I upgrade or cancel my plan?',
    a: 'You can upgrade or downgrade your plan at any time from your account settings. Upgrades take effect immediately. There are no long-term contracts or cancellation fees.',
  },
  {
    q: 'Is my business data secure?',
    a: 'Absolutely. We use industry-standard encryption for all data in transit and at rest. Your inventory data, supplier information, and business analytics are fully private and never shared with third parties.',
  },
];

/* ─── Testimonials Data ─────────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: 'KP Creation transformed how we manage our 800+ saree inventory. WhatsApp alerts alone saved us from running out of our bestselling Banarasi designs three times last month.',
    name: 'Ramesh Patel',
    role: 'Owner, Surat Silk House',
  },
  {
    quote: 'The AI forecasting feature predicted our Diwali season demand with incredible accuracy. We stocked exactly what we needed and reduced dead inventory by 40%.',
    name: 'Meena Devi',
    role: 'Director, Heritage Handlooms Co-op',
  },
  {
    quote: 'Managing stock requests across our 3 showrooms used to be chaos. Now every request goes through the approval workflow and we have complete visibility.',
    name: 'Arjun Shah',
    role: 'Operations Head, Shah Textiles',
  },
];

/* ─── Book Demo & Contact Modal ──────────────────────────────────────────── */
function BookDemoModal({ isOpen, onClose, initialPlan = 'team' }) {
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    phone: '',
    email: '',
    plan: initialPlan,
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, plan: initialPlan }));
  }, [initialPlan]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const openWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Hello KP Creation Team! I am ${formData.fullName || 'a business owner'} from ${formData.businessName || 'my saree firm'}. I would like to book a demo / enquire about the ${formData.plan.toUpperCase()} plan.`
    );
    window.open(`https://wa.me/919999999999?text=${text}`, '_blank');
  };

  return (
    <div className="lp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lp-modal-box">
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 18, right: 20,
            background: 'none', border: 'none',
            color: 'rgba(253, 242, 243, 0.5)',
            fontSize: 22, cursor: 'pointer', lineHeight: 1
          }}
        >
          &#10005;
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>&#10024;</div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#D4AF37', margin: '0 0 10px' }}>
              Request Received!
            </h3>
            <p style={{ color: 'rgba(253, 242, 243, 0.7)', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
              Thank you, <strong style={{ color: '#FDF2F3' }}>{formData.fullName}</strong>! Our handloom solutions specialist will reach out on <strong style={{ color: '#FDF2F3' }}>{formData.phone || 'your phone'}</strong> within 24 hours.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={openWhatsAppDirect}
                style={{
                  background: '#25D366', color: '#0B2211',
                  border: 'none', padding: '13px', borderRadius: 50,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit'
                }}
              >
                <span>&#128172;</span> Connect Instantly on WhatsApp
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(253, 242, 243, 0.08)', color: '#FDF2F3',
                  border: '1px solid rgba(253, 242, 243, 0.2)', padding: '12px',
                  borderRadius: 50, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 22 }}>
              <span className="lp-pill" style={{ fontSize: 11, padding: '4px 14px', marginBottom: 10 }}>
                &#128197; Personalized Platform Tour
              </span>
              <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#FDF2F3', margin: '6px 0 4px' }}>
                Book Your Live Demo
              </h3>
              <p style={{ color: 'rgba(253, 242, 243, 0.55)', fontSize: 13, margin: 0 }}>
                Experience how KP Creation streamlines artisanal saree beams, stock & weaver coordination.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="lp-form-label">Your Name *</label>
                  <input
                    required
                    className="lp-form-input"
                    placeholder="e.g. Ramesh Patel"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="lp-form-label">Firm / Business *</label>
                  <input
                    required
                    className="lp-form-input"
                    placeholder="e.g. Surat Silk House"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="lp-form-label">WhatsApp / Mobile *</label>
                  <input
                    required
                    className="lp-form-input"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="lp-form-label">Email</label>
                  <input
                    type="email"
                    className="lp-form-input"
                    placeholder="owner@domain.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <label className="lp-form-label">Interested Plan</label>
              <select
                className="lp-form-input"
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                style={{ background: '#240C19' }}
              >
                <option value="pro">Pro &#8212; &#8377;249 / month (Single Loom / Boutique)</option>
                <option value="team">Team &#8212; &#8377;399 / month (Recommended for Growth)</option>
                <option value="enterprise">Enterprise &#8212; Custom Architecture (Mills & Wholesale)</option>
              </select>

              <label className="lp-form-label">Specific Requirements / Message</label>
              <textarea
                rows={2}
                className="lp-form-input"
                placeholder="Tell us about your saree volume, looms, or specific tracking needs..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={{ resize: 'none', marginBottom: 20 }}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  className="lp-btn-primary"
                  style={{ flex: 1, padding: '13px', borderRadius: 50, fontSize: 14 }}
                >
                  Schedule Demo &#8594;
                </button>
                <button
                  type="button"
                  onClick={openWhatsAppDirect}
                  style={{
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.4)',
                    color: '#25D366',
                    padding: '13px 18px',
                    borderRadius: 50,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  title="Chat directly on WhatsApp"
                >
                  &#128172; WhatsApp
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── FAQ Item Component ────────────────────────────────────────────────── */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-faq-item" style={open ? { borderColor: 'rgba(212, 175, 55, 0.35)', background: 'rgba(212, 175, 55, 0.03)' } : {}}>
      <button className="lp-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span style={{
          fontSize: 20,
          color: '#D4AF37',
          transition: 'transform 0.3s ease',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}>+</span>
      </button>
      {open && (
        <div className="lp-faq-a">{a}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [selectedPlanForDemo, setSelectedPlanForDemo] = useState('team');

  useEffect(() => {
    if (!document.getElementById('kp-landing-styles')) {
      const tag = document.createElement('style');
      tag.id = 'kp-landing-styles';
      tag.textContent = STYLES;
      document.head.appendChild(tag);
    }
    return () => {
      const tag = document.getElementById('kp-landing-styles');
      if (tag) tag.remove();
    };
  }, []);

  const handleOpenDemo = (planId = 'team') => {
    setSelectedPlanForDemo(planId);
    setDemoModalOpen(true);
  };

  const goLogin = () => navigate('/login');
  const goSignUp = (plan = '') => {
    if (plan) {
      navigate(`/login?mode=signup&plan=${plan}`);
    } else {
      navigate('/login?mode=signup');
    }
  };
  const goDashboard = () => navigate('/dashboard');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp-root">
      {/* Demo Modal */}
      <BookDemoModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        initialPlan={selectedPlanForDemo}
      />

      {/* ── Background Orbs (reduced) ── */}
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1: NAVBAR
      ════════════════════════════════════════════════════════════════════ */}
      <nav className="lp-nav">
        {/* Brand */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B1A3A, #D4AF37)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#FDF2F3',
            fontFamily: 'Playfair Display, serif',
            boxShadow: '0 4px 18px rgba(139, 26, 58, 0.5)',
          }}>
            K
          </div>
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 18, fontWeight: 700, color: '#FDF2F3', letterSpacing: '0.5px', lineHeight: 1.1 }}>
              KP Creation
            </div>
            <div style={{ fontSize: 9, color: '#D4AF37', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 600 }}>
              Artisan Handloom
            </div>
          </div>
        </div>

        {/* Center Nav Links */}
        <div className="lp-nav-center" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {['Features', 'Pricing', 'FAQ'].map((label) => (
            <button
              key={label}
              onClick={() => scrollToSection(label.toLowerCase())}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(253, 242, 243, 0.7)',
                fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'color 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => e.target.style.color = '#D4AF37'}
              onMouseLeave={(e) => e.target.style.color = 'rgba(253, 242, 243, 0.7)'}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => handleOpenDemo('enterprise')}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(253, 242, 243, 0.7)',
              fontSize: 14, fontWeight: 500,
              cursor: 'pointer', transition: 'color 0.2s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => e.target.style.color = '#D4AF37'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(253, 242, 243, 0.7)'}
          >
            Contact
          </button>
        </div>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthenticated ? (
            <button
              className="lp-btn-primary"
              onClick={goDashboard}
              style={{ padding: '9px 22px', fontSize: 14 }}
            >
              Open Dashboard &#8594;
            </button>
          ) : (
            <>
              <button
                onClick={goLogin}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(253, 242, 243, 0.75)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => e.target.style.color = '#D4AF37'}
                onMouseLeave={(e) => e.target.style.color = 'rgba(253, 242, 243, 0.75)'}
              >
                Log in
              </button>
              <button
                onClick={() => goSignUp()}
                style={{
                  background: 'rgba(212, 175, 55, 0.12)',
                  border: '1.5px solid rgba(212, 175, 55, 0.5)',
                  color: '#F5C842',
                  padding: '8px 20px',
                  borderRadius: 50,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.target.style.background = '#D4AF37'; e.target.style.color = '#15060D'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(212, 175, 55, 0.12)'; e.target.style.color = '#F5C842'; }}
              >
                Sign Up
              </button>
              <button
                onClick={() => handleOpenDemo('team')}
                className="lp-btn-primary"
                style={{ padding: '9px 20px', fontSize: 14 }}
              >
                Book Demo
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2: CENTERED HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center',
        paddingTop: 'clamp(120px, 16vh, 180px)',
        paddingBottom: 'clamp(40px, 5vh, 60px)',
        paddingLeft: 24, paddingRight: 24,
      }}>
        {/* Pill */}
        <div style={{ animation: 'heroFadeUp 0.7s ease-out 0.1s both', marginBottom: 22 }}>
          <span className="lp-pill">
            <span style={{ fontSize: 16 }}>&#129525;</span> Artisanal Saree Management Platform
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(40px, 5.5vw, 76px)',
          fontWeight: 700,
          lineHeight: 1.1,
          color: '#FDF2F3',
          margin: '0 auto 18px',
          maxWidth: 800,
          animation: 'heroFadeUp 0.8s ease-out 0.2s both',
        }}>
          Where Tradition{' '}
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F5C842 40%, #D4AF37 60%, #B8860B 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 4s linear infinite',
          }}>
            Meets Mastery
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(16px, 1.5vw, 20px)',
          color: 'rgba(253, 242, 243, 0.65)',
          lineHeight: 1.7,
          maxWidth: 620,
          margin: '0 auto 36px',
          animation: 'heroFadeUp 0.8s ease-out 0.35s both',
        }}>
          Engineered for Indian handloom saree masters. Track every warp beam,
          color combination, weaver replenishment, and stock shortage with real-time clarity.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap',
          animation: 'heroFadeUp 0.9s ease-out 0.5s both',
          marginBottom: 48,
        }}>
          <button className="lp-btn-primary" onClick={() => goSignUp()} style={{ fontSize: 16, padding: '15px 36px' }}>
            Start Free Trial
          </button>
          <button className="lp-btn-secondary" onClick={() => handleOpenDemo('team')} style={{ fontSize: 16, padding: '14px 34px' }}>
            &#128197; Book a Demo
          </button>
        </div>

        {/* Centered Saree Hero Image */}
        <div className="lp-saree-hero-wrap" style={{ animation: 'heroFadeUp 1s ease-out 0.7s both' }}>
          <div className="lp-saree-hero-glow" />
          <div className="lp-saree-hero-img-wrap">
            <div className="lp-saree-hero-frame" />
            <img
              src="/saree-hero.jpg"
              alt="KP Creation Luxury Handloom Saree"
              className="lp-saree-hero-img"
            />
            <div className="lp-saree-hero-shimmer" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3: SOCIAL PROOF / STATS STRIP
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ position: 'relative', zIndex: 10, padding: 'clamp(48px, 6vh, 80px) 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={{
            fontSize: 16, fontWeight: 600,
            color: 'rgba(253, 242, 243, 0.65)',
            letterSpacing: '0.5px',
          }}>
            Built for handloom artisans across India
          </p>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          maxWidth: 960,
          margin: '0 auto',
        }}>
          {[
            { value: '500+', label: 'Saree Designs Tracked', icon: '\ud83e\ude7b' },
            { value: 'Instant', label: 'WhatsApp Replenishment', icon: '\u26a1' },
            { value: 'Multi-Role', label: 'Admin & Staff Access', icon: '\ud83d\udc65' },
            { value: '100%', label: 'Handloom Tailored', icon: '\ud83e\uddf5' },
          ].map(({ value, label, icon }, i) => (
            <div
              key={label}
              style={{
                textAlign: 'center', padding: '28px 24px',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: 18, background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(8px)',
                animation: `countUp 0.6s ease-out ${0.1 + i * 0.1}s both`,
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 'clamp(22px, 2.4vw, 30px)',
                fontWeight: 700, color: '#D4AF37', marginBottom: 4,
              }}>
                {value}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(253, 242, 243, 0.55)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4: FEATURES (4 alternating blocks)
      ════════════════════════════════════════════════════════════════════ */}
      <section id="features" style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vh, 100px) clamp(24px, 6vw, 80px)',
      }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(40px, 5vh, 72px)' }}>
          <span className="lp-pill" style={{ marginBottom: 16, display: 'inline-flex' }}>
            <span>&#10024;</span> Platform Features
          </span>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(30px, 4vw, 52px)',
            fontWeight: 700,
            color: '#FDF2F3',
            margin: '14px 0 14px',
          }}>
            Everything your saree business needs
          </h2>
          <p style={{
            fontSize: 17, color: 'rgba(253, 242, 243, 0.6)',
            maxWidth: 600, margin: '0 auto', lineHeight: 1.7,
          }}>
            From stock tracking to AI forecasting, every feature is built specifically for the handloom textile industry.
          </p>
        </div>

        {/* Feature blocks */}
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {FEATURES.map((feat, idx) => (
            <div
              key={feat.label}
              className="lp-feature-block"
              style={{ flexDirection: idx % 2 === 1 ? 'row-reverse' : 'row' }}
            >
              {/* Content side */}
              <div className="lp-feature-content">
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: '#D4AF37', letterSpacing: '1.5px',
                  textTransform: 'uppercase', marginBottom: 10, display: 'block',
                }}>
                  {feat.label}
                </span>
                <h3 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 'clamp(24px, 2.8vw, 36px)',
                  fontWeight: 700, color: '#FDF2F3',
                  margin: '0 0 16px', lineHeight: 1.2,
                }}>
                  {feat.title}
                </h3>
                <p style={{
                  fontSize: 15, color: 'rgba(253, 242, 243, 0.6)',
                  lineHeight: 1.7, margin: '0 0 24px',
                }}>
                  {feat.desc}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {feat.points.map((point) => (
                    <div key={point} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <CheckIcon gold />
                      <span style={{ fontSize: 14, color: 'rgba(253, 242, 243, 0.8)' }}>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual side */}
              <div className="lp-feature-visual">
                <div className="lp-feature-icon-box">
                  <div style={{
                    fontSize: 72, zIndex: 1,
                    filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.3))',
                  }}>
                    {feat.icon}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5: HOW IT WORKS (3 steps)
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vh, 100px) clamp(24px, 6vw, 80px)',
        background: 'linear-gradient(180deg, transparent 0%, rgba(26, 7, 16, 0.5) 50%, transparent 100%)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="lp-pill" style={{ marginBottom: 16, display: 'inline-flex' }}>
            <span>&#128640;</span> How It Works
          </span>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(30px, 4vw, 52px)',
            fontWeight: 700, color: '#FDF2F3', margin: '14px 0',
          }}>
            Get started in minutes
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 32,
          maxWidth: 960,
          margin: '0 auto',
        }}>
          {[
            {
              step: '01',
              icon: '\ud83d\udce5',
              title: 'Set Up Your Inventory',
              desc: 'Add your saree designs with colors, combinations, and stock levels. Import from Excel or enter manually.',
            },
            {
              step: '02',
              icon: '\ud83d\udcf1',
              title: 'Monitor & Get Alerts',
              desc: 'Track real-time stock across your operation. Receive instant WhatsApp alerts when stock runs low.',
            },
            {
              step: '03',
              icon: '\ud83d\udcc8',
              title: 'Analyze & Grow',
              desc: 'Use AI-powered demand forecasting and analytics to optimize stocking decisions and grow your business.',
            },
          ].map(({ step, icon, title, desc }, i) => (
            <div
              key={step}
              style={{
                textAlign: 'center',
                padding: '40px 32px',
                borderRadius: 24,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(212, 175, 55, 0.12)',
                position: 'relative',
              }}
            >
              <div style={{
                position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #8B1A3A, #C2185B)',
                color: '#FDF2F3', width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
              }}>
                {step}
              </div>
              <div style={{ fontSize: 48, marginBottom: 16, marginTop: 8 }}>{icon}</div>
              <h3 style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 22, fontWeight: 700, color: '#FDF2F3',
                margin: '0 0 12px',
              }}>
                {title}
              </h3>
              <p style={{
                fontSize: 14, color: 'rgba(253, 242, 243, 0.6)',
                lineHeight: 1.7, margin: 0,
              }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6: TESTIMONIALS
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vh, 100px) clamp(24px, 6vw, 80px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="lp-pill" style={{ marginBottom: 16, display: 'inline-flex' }}>
            <span>&#128172;</span> Customer Stories
          </span>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(30px, 4vw, 52px)',
            fontWeight: 700, color: '#FDF2F3', margin: '14px 0',
          }}>
            Trusted by saree businesses
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          maxWidth: 1080,
          margin: '0 auto',
        }}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              style={{
                padding: '36px 32px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Quote mark */}
              <div>
                <div style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 48, color: 'rgba(212, 175, 55, 0.3)',
                  lineHeight: 1, marginBottom: 8,
                }}>
                  &#8220;
                </div>
                <p style={{
                  fontSize: 15, color: 'rgba(253, 242, 243, 0.75)',
                  lineHeight: 1.7, margin: '0 0 24px',
                  fontStyle: 'italic',
                }}>
                  {t.quote}
                </p>
              </div>
              {/* Attribution */}
              <div style={{
                borderTop: '1px solid rgba(212, 175, 55, 0.12)',
                paddingTop: 16,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#FDF2F3' }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 13, color: '#D4AF37' }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 7: PRICING
      ════════════════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vh, 100px) clamp(24px, 6vw, 80px)',
        background: 'linear-gradient(180deg, transparent 0%, rgba(26, 7, 16, 0.5) 50%, transparent 100%)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span className="lp-pill" style={{ marginBottom: 16, display: 'inline-flex' }}>
            <span>&#128142;</span> Transparent & Predictable Pricing
          </span>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(30px, 4vw, 52px)',
            fontWeight: 700, color: '#FDF2F3',
            margin: '14px 0 14px',
          }}>
            Choose the Perfect Plan
          </h2>
          <p style={{
            fontSize: 17, color: 'rgba(253, 242, 243, 0.6)',
            maxWidth: 580, margin: '0 auto', lineHeight: 1.7,
          }}>
            Whether you run a bespoke boutique or an expansive weaving house, our plans scale seamlessly with your operations.
          </p>
        </div>

        {/* 3-Tier Grid */}
        <div className="lp-pricing-grid">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`lp-plan-card ${plan.popular ? 'lp-plan-team' : ''}`}
            >
              {plan.popular && (
                <div className="lp-plan-badge">
                  &#11088; Most Popular for Saree Houses
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: 26, fontWeight: 700,
                    color: plan.popular ? '#FDF2F3' : '#D4AF37',
                    margin: 0,
                  }}>
                    {plan.name}
                  </h3>
                  <span style={{
                    fontSize: 12, color: 'rgba(253, 242, 243, 0.5)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px 10px', borderRadius: 20,
                  }}>
                    {plan.subtitle}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '16px 0 14px' }}>
                  <span style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: plan.enterprise ? 38 : 50,
                    fontWeight: 700, color: '#FDF2F3', lineHeight: 1,
                  }}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span style={{ fontSize: 16, color: 'rgba(253, 242, 243, 0.55)', fontWeight: 500 }}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <p style={{ color: 'rgba(253, 242, 243, 0.55)', fontSize: 14, lineHeight: 1.6, minHeight: 44, margin: '0 0 24px' }}>
                  {plan.desc}
                </p>

                <div className="lp-divider" style={{ marginBottom: 24 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
                  {plan.features.map((feat, fi) => (
                    <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <CheckIcon gold={plan.enterprise || plan.popular} />
                      <span style={{ color: 'rgba(253, 242, 243, 0.8)', fontSize: 14, lineHeight: 1.45 }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Action Button */}
              <div>
                {plan.enterprise ? (
                  <button
                    onClick={() => handleOpenDemo('enterprise')}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #F5C842 100%)',
                      color: '#15060D', border: 'none',
                      padding: '14px', borderRadius: 50,
                      fontSize: 15, fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(212, 175, 55, 0.3)',
                      transition: 'all 0.25s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.92'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    Contact Us / Talk to Sales &#8594;
                  </button>
                ) : plan.popular ? (
                  <button
                    onClick={() => goSignUp('team')}
                    className="lp-btn-primary"
                    style={{ width: '100%', padding: '14px', borderRadius: 50, fontSize: 15 }}
                  >
                    Start 14-Day Free Trial &#8594;
                  </button>
                ) : (
                  <button
                    onClick={() => goSignUp('pro')}
                    style={{
                      width: '100%',
                      background: 'rgba(253, 242, 243, 0.05)',
                      border: '1.5px solid rgba(253, 242, 243, 0.35)',
                      color: '#FDF2F3', padding: '13px',
                      borderRadius: 50, fontSize: 15,
                      fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.25s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { e.target.style.borderColor = '#D4AF37'; e.target.style.color = '#D4AF37'; }}
                    onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(253, 242, 243, 0.35)'; e.target.style.color = '#FDF2F3'; }}
                  >
                    {plan.buttonText} &#8594;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Assurance */}
        <div style={{ textAlign: 'center', marginTop: 40, color: 'rgba(253, 242, 243, 0.45)', fontSize: 14 }}>
          &#128737;&#65039; All plans include 14-day risk-free trial &#183; Zero setup fee &#183; Cancel or upgrade at any time
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 8: FAQ
      ════════════════════════════════════════════════════════════════════ */}
      <section id="faq" style={{
        position: 'relative', zIndex: 10,
        padding: 'clamp(60px, 8vh, 100px) clamp(24px, 6vw, 80px)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span className="lp-pill" style={{ marginBottom: 16, display: 'inline-flex' }}>
            <span>&#10067;</span> Common Questions
          </span>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(30px, 4vw, 52px)',
            fontWeight: 700, color: '#FDF2F3', margin: '14px 0',
          }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 9: FINAL CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center',
        padding: 'clamp(60px, 9vh, 110px) 24px',
      }}>
        <div className="lp-divider" style={{ maxWidth: 200, margin: '0 auto 40px' }} />

        <h2 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(28px, 4vw, 48px)',
          fontWeight: 600, color: '#FDF2F3',
          margin: '0 0 16px',
        }}>
          Ready to Elevate Your{' '}
          <span style={{ color: '#D4AF37' }}>Handloom Operations?</span>
        </h2>

        <p style={{
          fontSize: 16, color: 'rgba(253, 242, 243, 0.55)',
          maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.7,
        }}>
          Join leading artisan houses managing their sarees with automated replenishment, series tracking, and master weaver ledgers.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="lp-btn-primary"
            onClick={() => goSignUp()}
            style={{ fontSize: 16, padding: '15px 40px' }}
          >
            Start Free Trial
          </button>
          <button
            className="lp-btn-secondary"
            onClick={() => handleOpenDemo('team')}
            style={{ fontSize: 16 }}
          >
            &#128197; Book a Live Demo
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 10: MULTI-COLUMN FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative', zIndex: 10,
        borderTop: '1px solid rgba(212, 175, 55, 0.15)',
        padding: '48px clamp(24px, 6vw, 80px) 28px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 40,
          maxWidth: 1100,
          margin: '0 auto',
          marginBottom: 40,
        }}>
          {/* Brand column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B1A3A, #D4AF37)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: '#FDF2F3',
                fontFamily: 'Playfair Display, serif',
              }}>
                K
              </div>
              <span style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 16, fontWeight: 700, color: '#FDF2F3',
              }}>
                KP Creation
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(253, 242, 243, 0.45)', lineHeight: 1.7 }}>
              Artisanal saree inventory management & intelligence platform, engineered for Indian handloom masters.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16, marginTop: 0 }}>
              Product
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Features', 'Pricing', 'Book Demo'].map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    if (label === 'Book Demo') handleOpenDemo('team');
                    else scrollToSection(label.toLowerCase());
                  }}
                  style={{
                    background: 'none', border: 'none', textAlign: 'left',
                    color: 'rgba(253, 242, 243, 0.55)',
                    fontSize: 14, cursor: 'pointer',
                    transition: 'color 0.2s', padding: 0, fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#FDF2F3'}
                  onMouseLeave={(e) => e.target.style.color = 'rgba(253, 242, 243, 0.55)'}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16, marginTop: 0 }}>
              Company
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Contact Us', action: () => handleOpenDemo('enterprise') },
                { label: 'Login', action: goLogin },
                { label: 'Sign Up', action: () => goSignUp() },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    background: 'none', border: 'none', textAlign: 'left',
                    color: 'rgba(253, 242, 243, 0.55)',
                    fontSize: 14, cursor: 'pointer',
                    transition: 'color 0.2s', padding: 0, fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#FDF2F3'}
                  onMouseLeave={(e) => e.target.style.color = 'rgba(253, 242, 243, 0.55)'}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16, marginTop: 0 }}>
              Legal
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Privacy Policy', 'Terms of Service'].map((label) => (
                <span
                  key={label}
                  style={{
                    color: 'rgba(253, 242, 243, 0.55)',
                    fontSize: 14,
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="lp-divider" style={{ marginBottom: 20 }} />
        <div style={{
          textAlign: 'center',
          color: 'rgba(253, 242, 243, 0.35)',
          fontSize: 13, letterSpacing: '0.3px',
        }}>
          &#169; {new Date().getFullYear()} KP Creation &#183; Artisan Handloom Saree Inventory & Intelligence &#183; All rights reserved
        </div>
      </footer>
    </div>
  );
}
