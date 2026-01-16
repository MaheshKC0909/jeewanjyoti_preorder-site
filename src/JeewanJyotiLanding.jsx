
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { HeartPulse, Users, Video, Stethoscope, ShieldCheck, BarChart3, Smartphone, Menu, X, ChevronDown, Mail, Phone, MessageSquare, Loader2, CheckCircle, XCircle } from "lucide-react";
import logo from "./assets/logo.png"; // ✅ Import your logo
import appScreenshot from "./assets/jeewanjyotiss.gif"; // ✅ Import your app GIF
import qrCode from "./assets/qr.jpg"; // ✅ Import your QR code

// API configuration
const API_BASE_URL = 'http://103.118.16.251:8002';

// Sticky disappearing heading component
function SectionHeading({ children }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [1, 1, 0.5, 0]);

  return (
    <motion.h2
      ref={ref}
      style={{ opacity }}
      className="sticky top-4 z-10 text-3xl md:text-4xl font-extrabold text-center text-sky-700 bg-sky-50/80 backdrop-blur-md py-4"
    >
      {children}
    </motion.h2>
  );
}

// Custom Button component
const Button = ({ children, className = "", size = "default", disabled = false, ...props }) => {
  const baseClasses =
    "font-medium transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-sky-400/50 shadow-lg hover:shadow-2xl transform hover:scale-105";
  const sizes = {
    default: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
    sm: "px-4 py-2 text-sm",
  };

  return (
    <button
      className={`${baseClasses} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Custom Card components
const Card = ({ children, className = "", ...props }) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.03 }}
    transition={{ type: "spring", stiffness: 200 }}
    className={`bg-white shadow-xl hover:shadow-2xl border border-transparent hover:border-sky-300/70 transition-all duration-300 ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

const CardContent = ({ children, className = "", ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

// Preorder Popup Component
function PreorderPopup({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    feedback: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous error when user starts typing
    if (submitStatus === 'error') {
      setSubmitStatus(null);
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitStatus(null);
    setErrorMessage('');

    // Log the data being sent for debugging
    console.log('Submitting data:', formData);

    try {
      const response = await fetch(`${API_BASE_URL}/preorder/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        setSubmitStatus('success');
        
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({ name: '', email: '', phone: '', feedback: '' });
          onClose();
          setSubmitStatus(null);
        }, 2000);
      } else {
        // Try to get detailed error information
        let errorData;
        try {
          errorData = await response.json();
          console.log('Error response:', errorData);
        } catch (parseError) {
          console.log('Could not parse error response as JSON');
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // Handle different types of error responses
        let errorMessage = 'Failed to submit preorder';
        if (errorData.detail) {
          // FastAPI validation error format
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => `${err.loc?.[1] || 'Field'}: ${err.msg}`).join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting preorder:', error);
      setSubmitStatus('error');
      setErrorMessage(error.message || 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', email: '', phone: '', feedback: '' });
      setSubmitStatus(null);
      setErrorMessage('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="fixed inset-x-4 top-[10%] bottom-4 md:inset-x-8 bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-6 relative flex flex-col items-center justify-center">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  disabled={isLoading}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </motion.button>
                
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <h2 className="text-3xl font-bold mb-2">🚀 Preorder Digital Care</h2>
                  <p className="text-sky-100">Join Nepal's first complete digital healthcare revolution today</p>
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {/* Form Section */}
                  <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Complete Your Preorder</h3>
                    
                    {/* Status Messages */}
                    {submitStatus === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-green-100 border border-green-300 rounded-xl flex items-center"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <p className="text-green-800 font-medium">Thank you for your preorder! We'll contact you soon.</p>
                      </motion.div>
                    )}

                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-red-100 border border-red-300 rounded-xl flex items-center"
                      >
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                        <div>
                          <p className="text-red-800 font-medium">Failed to submit preorder</p>
                          {errorMessage && <p className="text-red-700 text-sm mt-1">{errorMessage}</p>}
                        </div>
                      </motion.div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Full Name Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Users className="inline h-4 w-4 mr-2" />
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Your Full Name"
                        />
                      </div>

                      {/* Email Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail className="inline h-4 w-4 mr-2" />
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="your.email@example.com"
                        />
                      </div>

                      {/* Phone Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="inline h-4 w-4 mr-2" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          disabled={isLoading}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="+977 98XXXXXXXX"
                        />
                      </div>

                      {/* Feedback Field */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <MessageSquare className="inline h-4 w-4 mr-2" />
                          Feedback / Special Requests
                        </label>
                        <textarea
                          name="feedback"
                          value={formData.feedback}
                          onChange={handleInputChange}
                          rows={4}
                          disabled={isLoading}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="Tell us what you're most excited about or any special requirements..."
                        />
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={!isLoading ? { scale: 1.02 } : {}}
                        whileTap={!isLoading ? { scale: 0.98 } : {}}
                        className="w-full bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Submitting...
                          </>
                        ) : (
                          '💳 Secure Your Spot – Limited Preorders'
                        )}
                      </motion.button>
                    </form>

                    {/* Features List */}
                    <div className="mt-8 p-4 bg-sky-50 rounded-xl">
                      <h4 className="font-semibold text-gray-800 mb-3">What you get:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✅ Early access to the app</li>
                        <li>✅ Exclusive preorder pricing</li>
                        <li>✅ Priority customer support</li>
                        <li>✅ Beta testing privileges</li>
                      </ul>
                    </div>
                  </motion.div>

                  {/* QR Code Section */}
                  <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col items-center justify-start"
                  >
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Download with QR Code</h3>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-sky-200 mb-6">
                      <img 
                        src={qrCode} 
                        alt="Payment QR Code"
                        className="w-64 h-64 object-cover rounded-xl"
                      />
                    </div>

                    <div className="text-center space-y-2">
                      <p className="text-lg font-semibold text-gray-800">📲 Scan to Download</p>
                      <p className="text-sm text-gray-600">Quickly install the app on your device</p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        Point your camera at the QR code and follow the link to download JeewanJyoti Digital Care
                      </p>
                    </div>

                    {/* Payment Methods */}
                    <div className="mt-6 text-center">
                      <p className="text-sm text-gray-600 mb-2">Or download directly:</p>
                      <div className="flex justify-center space-x-2 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded">Google Play</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">App Store</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 p-4 text-center">
                <p className="text-sm text-gray-600">
                  🔒 Secure checkout • 💝 Trusted Care, Guaranteed • 📞 24/7 support
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Header/Navbar Component
function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'Blogs', href: '/blogs' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' }
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-lg shadow-xl border-b border-sky-100' 
          : 'bg-transparent'
      }`}
    >
      {/* ⬇️ Reduced navbar height */}
      <nav className="max-w-7xl mx-auto px-6 py-2">
        <div className="flex items-center justify-between">
          {/* ✅ Bigger Logo */}
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center space-x-2 cursor-pointer">
            <img 
              src={logo} 
              alt="Logo" 
              className="h-14 md:h-16 w-auto object-contain" 
            />
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-10">
            {navItems.map((item, index) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.dropdown && setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <motion.a
                  href={item.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center space-x-1 font-semibold text-lg transition-all duration-300 hover:text-sky-500 ${
                    isScrolled ? 'text-gray-700' : 'text-white/90'
                  }`}
                >
                  <span>{item.name}</span>
                  {item.dropdown && (
                    <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                  )}
                </motion.a>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {item.dropdown && activeDropdown === item.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-white shadow-2xl rounded-xl border border-gray-100 py-2"
                    >
                      {item.dropdown.map((dropdownItem) => (
                        <motion.a
                          key={dropdownItem.name}
                          href={dropdownItem.href}
                          whileHover={{ backgroundColor: '#f0f9ff', x: 4 }}
                          className="block px-4 py-3 text-gray-700 hover:text-sky-600 transition-colors duration-200"
                        >
                          {dropdownItem.name}
                        </motion.a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center">
            <Button
              size="sm"
              className={`rounded-full text-base px-6 py-2 transition-all duration-300 ${
                isScrolled
                  ? 'bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white'
                  : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20'
              }`}
              onClick={() => { window.location.assign('/register') }}
            >
              Join Us
            </Button>
            <Button
              size="sm"
              className={`ml-3 rounded-full text-base px-6 py-2 transition-all duration-300 ${
                isScrolled
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-white text-sky-700 hover:bg-sky-50 border border-sky-300'
              }`}
              onClick={() => { window.location.assign('/login') }}
            >
              Login
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors duration-300 ${
              isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="py-4">
                {navItems.map((item, index) => (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ backgroundColor: '#f0f9ff', x: 8 }}
                    className="block px-6 py-3 text-gray-700 hover:text-sky-600 font-medium text-lg transition-all duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </motion.a>
                ))}
                <div className="border-t border-gray-100 mt-4 pt-4 px-6">
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white rounded-xl"
                    onClick={() => { window.location.assign('/register') }}
                  >
                    Join Us
                  </Button>
                  <div className="h-3" />
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    onClick={() => { window.location.assign('/login') }}
                  >
                    Login
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}

export default function JeewanJyotiLanding() {
  const [isPreorderPopupOpen, setIsPreorderPopupOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-sky-100 to-gray-900 text-gray-900">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-32 px-6 overflow-hidden min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 bg-gradient-to-tr from-sky-400 via-blue-500 to-purple-600 blur-3xl opacity-20 animate-pulse"
        />

        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="pb-3 text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-700 drop-shadow-lg"
        >
          JeewanJyoti Digital Care
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mt-6 max-w-2xl text-lg md:text-xl text-gray-700"
        >
          "Nepal's first complete digital health companion – connect your tracking device, monitor your vitals in real-time, care for your loved ones, consult doctors anytime, and unlock a smarter way to stay healthy."
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-10"
        >
          <Button size="lg" className="bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white rounded-2xl shadow-xl">
            🚀 Launching Soon
          </Button>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-6">
              About <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-700">Jeewan Jyoti Digital Care</span>
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content Side */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8"
            >
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-gray-700 leading-relaxed">
                  At <strong className="text-sky-700">Jeewan Jyoti Digital Care</strong>, we are dedicated to transforming healthcare in Nepal through innovation and technology. Our goal is to bridge the gap between patients and healthcare providers by delivering smart, reliable, and accessible digital solutions.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  We focus on improving quality of care, enhancing accessibility, and empowering both individuals and professionals with meaningful health insights. With a patient-centered approach and a commitment to affordability, we strive to make a lasting impact on the health and well-being of communities across the country.
                </p>
              </div>

              {/* Key Values */}
              <div className="grid sm:grid-cols-2 gap-6 mt-12">
                {[
                  { title: "Innovation", desc: "Cutting-edge technology for modern healthcare", icon: "🚀" },
                  { title: "Accessibility", desc: "Healthcare solutions for everyone, everywhere", icon: "🌍" },
                  { title: "Quality", desc: "Premium care standards you can trust", icon: "⭐" },
                  { title: "Affordability", desc: "Cost-effective solutions for all families", icon: "💝" }
                ].map((value, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-r from-sky-50 to-blue-50 p-6 rounded-xl border border-sky-100 hover:border-sky-300 transition-all duration-300"
                  >
                    <div className="text-2xl mb-2">{value.icon}</div>
                    <h4 className="font-bold text-gray-800 mb-1">{value.title}</h4>
                    <p className="text-gray-600 text-sm">{value.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* GIF/Screenshot Side */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="relative group">
                {/* Decorative background */}
                <div className="absolute -inset-4 bg-gradient-to-r from-sky-400 to-blue-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                
                {/* Main container */}
                <div className="relative bg-white rounded-2xl shadow-2xl border border-sky-100 overflow-hidden">
                  {/* Phone frame effect */}
                  <div className="bg-gray-900 h-8 rounded-t-2xl flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  
                  {/* GIF container */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="p-4 bg-gradient-to-br from-sky-50 to-blue-50"
                  >
                    <img 
                      src={appScreenshot} 
                      alt="Jeewan Jyoti Digital Care App Demo"
                      className="w-full h-auto rounded-xl shadow-lg border border-sky-200"
                    />
                  </motion.div>
                </div>

                {/* Floating elements */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -top-4 -right-4 bg-sky-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
                >
                  Live Demo ✨
                </motion.div>
                
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-6 -left-6 bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
                >
                  🏥 Healthcare Made Simple
                </motion.div>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="grid grid-cols-3 gap-4 mt-12"
              >
                {[
                  { number: "1000+", label: "Early Users" },
                  { number: "24/7", label: "Support" },
                  { number: "100%", label: "Secure" }
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-sky-600">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
        <SectionHeading>✨ Features</SectionHeading>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 mt-12">
          {[
            { icon: HeartPulse, title: "Health Tracking", desc: "Monitor vitals and daily health parameters in real time." },
            { icon: Users, title: "Loved Ones Mapping", desc: "Stay connected and keep an eye on the wellbeing of family members." },
            { icon: Stethoscope, title: "Doctor Appointments", desc: "Easily book appointments with certified doctors through the app." },
            { icon: Video, title: "Video Consultation", desc: "Connect face-to-face with healthcare professionals via secure video calls." },
            { icon: ShieldCheck, title: "Secure & Private", desc: "Your data is protected with top-level encryption and privacy measures." },
            { icon: BarChart3, title: "Progress Insights", desc: "Visualize trends in your health journey with smart analytics." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <Card className="rounded-2xl">
                <CardContent className="flex flex-col items-center p-8">
                  <motion.div
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    className="p-3 rounded-full bg-sky-100 shadow-md"
                  >
                    <item.icon className="h-12 w-12 text-sky-600" />
                  </motion.div>
                  <h3 className="mt-4 text-xl font-bold text-gray-800">{item.title}</h3>
                  <p className="mt-3 text-gray-600 text-center">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* All-in-One App Highlight */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="md:col-span-2 lg:col-span-3"
          >
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col items-center p-12">
                <Smartphone className="h-16 w-16 text-sky-600 mb-4 animate-bounce" />
                <h3 className="text-3xl font-extrabold text-gray-800">All-in-One App</h3>
                <p className="mt-4 text-gray-600 text-center text-lg max-w-2xl">
                  One simple, intuitive app to manage health, family, and medical care. Everything you need in one place.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="bg-gradient-to-r from-sky-700 to-sky-900 text-white py-24 px-6 text-center relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Preorder Digital Care Today</h2>
          <p className="text-lg md:text-xl mb-6 opacity-90">Get early access to a healthier, more connected future</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <span className="text-3xl font-bold text-yellow-300">🔥 Early-Bird Offer</span>
             <span className="text-lg opacity-75">• Price Revealed at Launch •</span>
          </div>
          <Button 
            size="lg" 
            onClick={() => setIsPreorderPopupOpen(true)}
            className="bg-white text-sky-700 hover:bg-gray-100 rounded-2xl font-bold"
          >
            Preorder Now →
          </Button>
          <p className="mt-6 text-sm opacity-75">✨ Join 1000+ early adopters already signed up</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center justify-center mb-6"
          >
            <HeartPulse className="h-8 w-8 text-sky-400 mr-2 animate-pulse" />
            <span className="text-xl font-bold">JeewanJyoti Digital Care</span>
          </motion.div>
          <p className="text-gray-400 mb-4">
            Revolutionizing healthcare accessibility in Nepal, one family at a time.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-500">
            <span>© 2024 JeewanJyoti Care</span>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-sky-400 transition-colors">Privacy Policy</a>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-sky-400 transition-colors">Terms of Service</a>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-sky-400 transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>

      {/* Preorder Popup */}
      <PreorderPopup 
        isOpen={isPreorderPopupOpen} 
        onClose={() => setIsPreorderPopupOpen(false)} 
      />
    </div>
  );
}