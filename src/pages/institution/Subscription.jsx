import React, { useState, useEffect } from 'react';
import {
  Crown, Check, X, Zap, Shield, Users, Activity, BarChart3,
  Smartphone, HeadphonesIcon, Star, ArrowRight, CreditCard, Clock,
  ChevronDown, ChevronUp, Sparkles, Loader
} from 'lucide-react';

const FAQ = [
  { q: 'Can I upgrade or downgrade at any time?', a: 'Yes, you can change your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the remaining credit will be applied to future billing.' },
  { q: 'What payment methods do you accept?', a: 'For now, we accept payments exclusively via Khalti.' },
  { q: 'What happens when my subscription expires?', a: 'Your account will be downgraded to the Basic (free) plan. All your data will be preserved, but some features will be restricted.' },
];

const PLAN_STYLES = [
  {
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    icon: <Zap size={20} color="#fff" />
  },
  {
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    icon: <Star size={20} color="#fff" />
  },
  {
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
    icon: <Crown size={20} color="#fff" />
  },
  {
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    icon: <Shield size={20} color="#fff" />
  }
];

export default function SubscriptionTab() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  
  const [plans, setPlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Find the currently active plan from my subscriptions
  const activeSubscription = mySubscriptions.find(sub => sub.is_active);
  const currentPlanId = activeSubscription ? activeSubscription.package : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Import authenticatedFetch here to avoid circular dependencies
        const { authenticatedFetch } = await import('../../lib/tokenManager');
        
        // Fetch both available plans and user's subscriptions in parallel
        const [plansRes, mySubsRes] = await Promise.all([
          authenticatedFetch('https://jeewanjyoti-backend.smart.org.np/api/set_ins_subscription/'),
          authenticatedFetch('https://jeewanjyoti-backend.smart.org.np/api/get_my_subscription/')
        ]);

        if (!plansRes.ok) throw new Error('Failed to fetch subscription plans');
        if (!mySubsRes.ok) throw new Error('Failed to fetch my subscriptions');

        const plansData = await plansRes.json();
        let mySubsData = await mySubsRes.json();
        
        // The API might return a single object instead of an array for a single subscription
        if (mySubsData && !Array.isArray(mySubsData) && mySubsData.id) {
          mySubsData = [mySubsData];
        } else if (!Array.isArray(mySubsData)) {
          // If it's some other non-array response (like an error object), default to empty
          mySubsData = [];
        }
        
        setPlans(plansData);
        setMySubscriptions(mySubsData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <Loader className="animate-spin" size={40} color="#3b82f6" />
        <div style={{ color: '#64748b', fontSize: 16, fontWeight: 500 }}>Loading subscription data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>Failed to load subscriptions</div>
        <div style={{ color: '#64748b', fontSize: 14 }}>{error}</div>
        <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 10 }}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Crown size={22} color="#f59e0b" />
          <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Subscription Plans</span>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          Manage your active subscriptions and explore new plans for your institution.
        </p>
      </div>

      {/* My Subscriptions */}
      {mySubscriptions.length > 0 ? (
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
            My Subscriptions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mySubscriptions.map(sub => (
              <div key={sub.id} style={{
                background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
                border: '1px solid #bfdbfe',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Shield size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>
                      {sub.package_name}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, display: 'flex', gap: 12, marginTop: 4 }}>
                      <span>Max {sub.max_users} Users</span>
                      <span>•</span>
                      <span>Rs. {parseFloat(sub.amount_paid).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} color="#64748b" />
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                        Expires: {new Date(sub.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Started: {new Date(sub.start_date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: sub.is_active ? '#dcfce7' : '#fef2f2',
                    color: sub.is_active ? '#16a34a' : '#ef4444',
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {sub.is_active ? 'Active' : 'Expired'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 16,
          padding: '32px', textAlign: 'center', marginBottom: 40
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            No Active Subscriptions
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            You don't have any active subscriptions yet. Choose a plan below to get started.
          </div>
        </div>
      )}

      {/* Available Plans Header */}
      <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
        Available Plans
      </div>

      {/* Plan Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300, 1fr))',
        gap: 20,
        marginBottom: 48,
      }}>
        {plans.map((plan, index) => {
          const isCurrentPlan = currentPlanId === plan.id;
          const isHovered = hoveredPlan === plan.id;
          const isPopular = index === 1; // Highlight the second plan as popular if it exists
          
          const style = PLAN_STYLES[index % PLAN_STYLES.length];
          const displayPrice = parseFloat(plan.price) === 0 ? 'Free' : `Rs. ${parseFloat(plan.price).toLocaleString()}`;
          const period = `/${plan.duration_type}`;

          return (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              style={{
                background: isPopular
                  ? 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)'
                  : '#fff',
                borderRadius: 20,
                border: isPopular ? '1px solid #334155' : '1px solid #e2e8f0',
                padding: isPopular ? '4px 4px 4px 4px' : 0,
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered
                  ? '0 20px 40px -12px rgba(0,0,0,0.15)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div style={{
                  textAlign: 'center', padding: '8px 0 4px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6
                }}>
                  <Sparkles size={13} color="#f59e0b" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Most Popular
                  </span>
                  <Sparkles size={13} color="#f59e0b" />
                </div>
              )}

              <div style={{
                background: isPopular ? '#fff' : 'transparent',
                borderRadius: isPopular ? 16 : 20,
                padding: '28px 24px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Plan header */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: style.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                  }}>
                    {style.icon}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, minHeight: 36 }}>
                    {plan.description}
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#0f172a' }}>
                    {displayPrice}
                  </span>
                  {displayPrice !== 'Free' && (
                    <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
                      {period}
                    </span>
                  )}
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={14} /> Max {plan.max_users} Users
                  </div>
                </div>

                {/* CTA */}
                <button style={{
                  width: '100%', padding: '12px 0', borderRadius: 12,
                  border: isCurrentPlan ? `2px solid ${style.color}` : 'none',
                  background: isCurrentPlan ? 'transparent' : style.gradient,
                  color: isCurrentPlan ? style.color : '#fff',
                  fontSize: 13, fontWeight: 700, cursor: isCurrentPlan ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                  opacity: isCurrentPlan ? 0.7 : 1,
                  marginTop: 'auto'
                }}>
                  {isCurrentPlan ? 'Current Plan' : (
                    <>
                      Select {plan.name}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Features (Dynamically generated based on limits) */}
                <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                    What's included
                  </div>
                  {[
                    { text: `Up to ${plan.max_users} members`, included: true },
                    { text: `${plan.duration_days} days duration`, included: true },
                    { text: 'Dashboard access', included: true },
                    { text: 'Priority support', included: plan.max_users > 50 },
                    { text: 'Custom branding', included: plan.max_users > 100 },
                  ].map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 0', fontSize: 13, fontWeight: 500,
                      color: f.included ? '#334155' : '#cbd5e1',
                    }}>
                      {f.included ? (
                        <div style={{
                          width: 18, height: 18, borderRadius: 6,
                          background: `${style.color}15`, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Check size={11} color={style.color} strokeWidth={3} />
                        </div>
                      ) : (
                        <div style={{
                          width: 18, height: 18, borderRadius: 6,
                          background: '#f1f5f9', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <X size={11} color="#cbd5e1" strokeWidth={3} />
                        </div>
                      )}
                      {f.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Methods */}
      <div style={{
        background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
        padding: '24px', marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <CreditCard size={18} color="#3b82f6" />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Accepted Payment Methods</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['Khalti'].map((method, i) => (
            <div key={i} style={{
              padding: '10px 18px', borderRadius: 10, background: '#f8fafc',
              border: '1px solid #e2e8f0', fontSize: 13, fontWeight: 600, color: '#475569'
            }}>
              {method}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{
        background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0',
        padding: '28px 24px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 20 }}>
          Frequently Asked Questions
        </div>
        {FAQ.map((item, i) => (
          <div
            key={i}
            style={{
              borderBottom: i < FAQ.length - 1 ? '1px solid #f1f5f9' : 'none',
              padding: '14px 0',
            }}
          >
            <button
              onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{item.q}</span>
              {expandedFaq === i
                ? <ChevronUp size={16} color="#94a3b8" />
                : <ChevronDown size={16} color="#94a3b8" />
              }
            </button>
            {expandedFaq === i && (
              <div style={{
                marginTop: 10, fontSize: 13, color: '#64748b', lineHeight: 1.7,
                paddingLeft: 2,
              }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
