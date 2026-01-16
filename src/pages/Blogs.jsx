import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Trash2, Plus } from 'lucide-react';

const API_BASE_URL = 'https://jeewanjyoti-backend.smart.org.np/api';
const BLOGS_ENDPOINT = `${API_BASE_URL}/blogs`;

// Default empty blog template
const defaultBlog = {
  title: '',
  body: '',
  photo: null
};

// Sample blog images (using placeholder images from Unsplash)
const sampleBlogs = [
  {
    id: 1,
    title: "10 Tips for a Healthier Lifestyle in 2025",
    summary: "Discover the latest health trends and simple changes you can make for a healthier lifestyle this year.",
    image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "2025-12-10",
    content: "Maintaining a healthy lifestyle is crucial for overall well-being. In this post, we'll explore 10 practical tips that can help you improve your health in 2025. From nutrition advice to exercise routines, these tips are easy to implement and can make a significant difference in your daily life..."
  },
  {
    id: 2,
    title: "Understanding Heart Health: A Complete Guide",
    summary: "Learn about the importance of heart health and how to keep your heart strong and healthy at any age.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "2025-11-28",
    content: "Your heart is one of the most important organs in your body. In this comprehensive guide, we'll cover everything you need to know about maintaining optimal heart health, including diet recommendations, exercise tips, and warning signs to watch out for..."
  },
  {
    id: 3,
    title: "The Future of Digital Healthcare in Nepal",
    summary: "How technology is transforming healthcare accessibility in Nepal and what it means for you.",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "2025-11-15",
    content: "The healthcare landscape in Nepal is evolving rapidly with the advent of digital health solutions. In this article, we explore how telemedicine, health tracking apps, and AI are making healthcare more accessible to people across the country..."
  },
  {
    id: 4,
    title: "Mindfulness and Mental Wellbeing",
    summary: "Explore the benefits of mindfulness and how it can improve your mental health and overall quality of life.",
    image: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "2025-11-05",
    content: "In today's fast-paced world, taking care of our mental health is more important than ever. This post dives into various mindfulness techniques that can help reduce stress, improve focus, and enhance overall well-being..."
  },
  {
    id: 5,
    title: "Nutrition Myths Debunked",
    summary: "Separating fact from fiction in the world of nutrition and healthy eating.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "2025-10-22",
    content: "There's a lot of conflicting information about nutrition out there. In this article, we'll debunk some common nutrition myths and provide evidence-based advice for healthy eating..."
  },
  {
    id: 6,
    title: "The Importance of Regular Health Check-ups",
    summary: "Why regular health screenings are essential for early detection and prevention of diseases.",
    image: "https://images.unsplash.com/photo-1505751172876-fa186e9d30c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
    date: "2025-10-10",
    content: "Preventive healthcare is key to maintaining good health. This post explains the importance of regular check-ups, what tests you should consider based on your age and risk factors, and how they can help in early disease detection..."
  }
];

function BlogModal({ blog, onClose }) {

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
        
        {blog.photo ? (
          <div className="h-64 w-full overflow-hidden rounded-t-2xl">
            <img 
              src={`https://jeewanjyoti-backend.smart.org.np${blog.photo}`} 
              alt={blog.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/800x400?text=Blog+Image';
              }}
            />
          </div>
        ) : (
          <div className="h-48 bg-gray-100 flex items-center justify-center rounded-t-2xl">
            <span className="text-gray-400">No image</span>
          </div>
        )}
        
        <div className="p-6 md:p-8">
          <div className="text-sm font-medium text-sky-600 mb-2">
            {new Date(blog.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            {blog.updated_at !== blog.created_at && (
              <span className="text-xs text-gray-500 ml-2">
                (Updated: {new Date(blog.updated_at).toLocaleDateString()})
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {blog.title}
          </h2>
          
          <div className="prose max-w-none text-gray-700 whitespace-pre-line">
            {blog.body}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BlogForm({ blog = null, onSave, onCancel, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    title: blog?.title || '',
    body: blog?.body || '',
    photo: null
  });
  const [preview, setPreview] = useState(blog?.photo ? `https://jeewanjyoti-backend.smart.org.np${blog.photo}` : null);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo') {
      const file = files[0];
      setFormData(prev => ({ ...prev, photo: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      if (file) {
        reader.readAsDataURL(file);
      } else {
        setPreview(blog?.photo ? `https://jeewanjyoti-backend.smart.org.np${blog.photo}` : null);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('body', formData.body);
    if (formData.photo) {
      formDataToSend.append('photo', formData.photo);
    }
    onSave(formDataToSend, blog?.id);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">
        {blog ? 'Edit Blog Post' : 'Create New Blog Post'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2" htmlFor="title">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2" htmlFor="body">
            Content
          </label>
          <textarea
            id="body"
            name="body"
            value={formData.body}
            onChange={handleChange}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2" htmlFor="photo">
            Featured Image
          </label>
          <input
            type="file"
            id="photo"
            name="photo"
            accept="image/*"
            onChange={handleChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
          />
          {preview && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Preview:</p>
              <img 
                src={preview} 
                alt="Preview" 
                className="max-h-48 rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Post'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(BLOGS_ENDPOINT);
      if (!response.ok) throw new Error('Failed to fetch blogs');
      const data = await response.json();
      setBlogs(data);
    } catch (err) {
      setError('Failed to load blogs. Please try again later.');
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleViewBlog = async (blogId) => {
    try {
      setLoading(true);
      const response = await fetch(`${BLOGS_ENDPOINT}/${blogId}/`);
      if (!response.ok) throw new Error('Failed to fetch blog details');
      const data = await response.json();
      setSelectedBlog(data);
    } catch (err) {
      setError('Failed to load blog details. Please try again.');
      console.error('Error fetching blog details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlog = () => {
    setEditingBlog(null);
    setIsFormOpen(true);
  };

  const handleEditBlog = (blog) => {
    setEditingBlog(blog);
    setIsFormOpen(true);
  };

  const handleSaveBlog = async (formData, blogId = null) => {
    try {
      setIsSubmitting(true);
      const url = blogId ? `${BLOGS_ENDPOINT}/${blogId}/` : BLOGS_ENDPOINT;
      const method = blogId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
        // Don't set Content-Type header when using FormData
        // The browser will set it with the correct boundary
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save blog');
      }

      await fetchBlogs();
      setIsFormOpen(false);
      setEditingBlog(null);
    } catch (err) {
      setError(err.message || 'Failed to save blog. Please try again.');
      console.error('Error saving blog:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${BLOGS_ENDPOINT}/${blogId}/`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete blog');
      }

      // If the deleted blog is currently selected, close the modal
      if (selectedBlog && selectedBlog.id === blogId) {
        setSelectedBlog(null);
      }

      await fetchBlogs();
    } catch (err) {
      setError('Failed to delete blog. Please try again.');
      console.error('Error deleting blog:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBlog(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto"
      >
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Our Blogs & Updates
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-xl text-gray-500">
            Stay updated with the latest health tips, news, and stories from Jeewan Jyoti.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && blogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-600"></div>
            <p className="mt-4 text-gray-600">Loading blogs...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No blog posts available</h3>
            <p className="mt-1 text-gray-500">Please check back later for updates.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {blogs.map((blog) => (
              <motion.div
                key={blog.id}
                whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col h-full"
                onClick={() => handleViewBlog(blog.id)}
              >
                {blog.photo ? (
                  <div className="h-48 w-full overflow-hidden">
                    <img
                      className="w-full h-full object-cover"
                      src={`https://jeewanjyoti-backend.smart.org.np${blog.photo}`}
                      alt={blog.title}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/800x400?text=Blog+Image';
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                  <div className="text-sm font-medium text-sky-600">
                    {new Date(blog.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900 line-clamp-2">
                    {blog.title}
                  </h3>
                  <p className="mt-3 text-gray-600 flex-grow line-clamp-3">
                    {blog.body}
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewBlog(blog.id);
                      }}
                      className="text-sky-600 hover:text-sky-700 font-medium text-sm"
                    >
                      Read more →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Blog View Modal */}
        <AnimatePresence>
          {selectedBlog && (
            <BlogModal 
              blog={selectedBlog} 
              onClose={() => setSelectedBlog(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default Blogs;
