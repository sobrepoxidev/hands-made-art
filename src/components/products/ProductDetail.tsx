'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, 
  MinusCircle, 
  PlusCircle, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Search, 
  ArrowLeft,
  Check,
  Tag,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSupabase } from '@/app/supabase-provider/provider';
import { useCart } from '@/context/CartContext';
import { Database } from '@/types-db';
import ReviewsList from '@/components/products/ReviewsList';
import ReviewForm from '@/components/products/ReviewForm';

type Product = Database['products'];
type Category = Database['categories'];

// The client component that handles UI and state
export default function ProductDetail({ id, locale }: { id: string, locale: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [inventory, setInventory] = useState<number>(0);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState<number>(0);
  
  const { addToCart } = useCart();
  const router = useRouter();
  
  // Get Supabase session at the component level
  const { session } = useSupabase();
  
  // Cargar producto por ID y sus datos relacionados
  useEffect(() => {
    async function fetchProductAndRelatedData() {
      setLoading(true);
      try {
        // Fetch product data
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (productError) {
          throw productError;
        }

        if (!productData) {
          setError('Producto no encontrado');
          setLoading(false);
          return;
        }

        setProduct(productData as Product);

        // Registrar la visualización en el historial (si hay un usuario autenticado)
        if (session?.user) {
          // Record view in view_history table
          await supabase.from('view_history').insert({
            user_id: session.user.id,
            product_id: productData.id,
          }).select();
        }

        // Fetch category if available
        if (productData.category_id) {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('*')
            .eq('id', productData.category_id)
            .single();
          
          setCategory(categoryData as Category);
        }

        // Fetch inventory data
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('product_id', productData.id)
          .single();
        
        if (inventoryData) {
          setInventory(inventoryData.quantity);
        }

        // Check if product is in favorites (if user is logged in)
        if (session?.user) {
          const { data: favoriteData } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('product_id', productData.id)
            .single();

          setIsFavorite(!!favoriteData);
        }

      } catch (err) {
        console.error('Error al cargar el producto:', err);
        setError('Error al cargar el producto');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProductAndRelatedData();
    }
  }, [id]); // Use id as dependency

  // Manejar la cantidad
  const handleIncrement = () => {
    if (quantity < 10) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  // Manejar el zoom de la imagen
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;

    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    const y = (e.clientY - top) / height;

    setZoomPosition({ x, y });
  };

  // Añadir o quitar de favoritos
  const handleToggleFavorite = async () => {
    if (!product) return;
    
    // Verificar si hay un usuario autenticado
    // Usamos el session del nivel de componente
    if (!session?.user) {
      // Redireccionar a login si no hay usuario
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    try {
      if (isFavorite) {
        // Eliminar de favoritos
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', product.id);
          
        if (error) throw error;
        setIsFavorite(false);
      } else {
        // Añadir a favoritos
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: session.user.id,
            product_id: product.id
          });
          
        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (err) {
      console.error('Error al actualizar favoritos:', err);
    }
  };

  // Añadir al carrito
  const handleAddToCart = async () => {
    if (!product) return;
    
    // Añadir al carrito
    addToCart(product, quantity);
    
    // Sincronizar con la base de datos si hay un usuario
    // Usamos el session del nivel de componente
    if (session?.user) {
      try {
        // Verificar si ya existe en el carrito
        const { data: existingItem } = await supabase
          .from('cart_items')
          .select('id, quantity')
          .eq('user_id', session.user.id)
          .eq('product_id', product.id)
          .single();
        
        if (existingItem) {
          // Actualizar cantidad
          await supabase
            .from('cart_items')
            .update({ quantity: existingItem.quantity + quantity })
            .eq('id', existingItem.id);
        } else {
          // Insertar nuevo item
          await supabase
            .from('cart_items')
            .insert({
              user_id: session.user.id,
              product_id: product.id,
              quantity: quantity
            });
        }
      } catch (error) {
        console.error('Error al sincronizar con la base de datos:', error);
      }
    }
    
  };

  // Si está cargando, muestra un spinner
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Si hay un error, muestra un mensaje
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 inline-block">
          <h1 className="text-xl font-semibold text-red-700 mb-2">
            {error || 'Producto no encontrado'}
          </h1>
          <p className="text-red-600 mb-4">
            Lo sentimos, no pudimos encontrar el producto que estás buscando.
          </p>
          <Link 
            href="/products" 
            className="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a productos
          </Link>
        </div>
      </div>
    );
  }

  const mainImageUrl = product.media?.[activeImageIndex]?.url || '/product-placeholder.png';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center text-sm text-gray-500">
        <Link href="/" className="hover:text-teal-600">Inicio</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href="/products" className="hover:text-teal-600">Productos</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-gray-900 truncate max-w-[200px]">{locale === 'es' ? product.name_es : product.name_en}</span>
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Columna izquierda: Imágenes */}
        <div className="w-full md:w-7/12">
          <div className="sticky top-24">
            {/* Imagen principal con zoom */}
            <div 
              className="relative bg-white h-[400px] md:h-[500px] flex items-center justify-center border border-gray-200 rounded-lg overflow-hidden cursor-zoom-in mb-4"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
              onClick={() => setIsZoomed(!isZoomed)}
            >
              <div className="relative w-full h-full">
                <Image
                  src={mainImageUrl}
                  alt={product.name || ''}
                  fill
                  className={`object-contain transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'}`}
                  style={isZoomed ? {
                    transformOrigin: `${zoomPosition.x * 100}% ${zoomPosition.y * 100}%`
                  } : undefined}
                  priority
                />
                {isZoomed && (
                  <div className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-2">
                    <Search className="h-4 w-4 text-gray-700" />
                  </div>
                )}
              </div>
            </div>

            {/* Galería de miniaturas */}
            {product.media && product.media.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.media.map((item, index) => (
                  <button
                    key={index}
                    className={`relative h-20 border rounded-md overflow-hidden transition hover:border-teal-500 ${
                      activeImageIndex === index ? 'border-teal-500 ring-2 ring-teal-300' : 'border-gray-200'
                    }`}
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                  >
                    <Image
                      src={item.url}
                      alt={`Imagen ${index + 1} de ${locale === 'es' ? product.name_es : product.name_en}`}
                      fill
                      className="object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Información del producto */}
        <div className="w-full md:w-5/12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {locale === 'es' ? product.name_es : product.name_en}
          </h1>
          
          {/* Categoría */}
          <div className="mb-4">
            {category && (
              <Link 
                href={`/products?category=${category.id}`}
                className="inline-block px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full border border-teal-100 hover:bg-teal-100 transition"
              >
                {locale === 'es' ? category.name_es : category.name_en}
              </Link>
            )}
            {product.brand && (
              <span className="ml-2 inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full border border-blue-100">
                {product.brand}
              </span>
            )}
          </div>
          
          {/* Precio */}
          <div className="mb-6">
            {product.price ? (
              <div className="flex items-end gap-2">
                {product.discount_percentage && product.discount_percentage > 0 ? (
                  <>
                    <p className="text-3xl font-bold text-teal-700">
                      ₡{(product.price * (1 - product.discount_percentage / 100)).toFixed(0)}
                    </p>
                    <p className="text-lg text-gray-500 line-through">
                      ₡{product.price.toFixed(0)}
                    </p>
                    <span className="text-sm font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded">
                      {product.discount_percentage}% OFF
                    </span>
                  </>
                ) : (
                  <p className="text-3xl font-bold text-teal-700">
                    ₡{product.price.toFixed(0)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xl font-medium text-teal-700">
                Precio a consultar
              </p>
            )}
            
            {/* Inventario */}
            <p className="mt-2 text-sm">
              {inventory > 0 ? (
                <span className="text-green-600 flex items-center">
                  <Check className="h-4 w-4 mr-1" />
                  {inventory > 10 ? 'En stock' : `Solo quedan ${inventory} unidades`}
                </span>
              ) : (
                <span className="text-red-600">Agotado</span>
              )}
            </p>
            
            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-gray-500 mt-1">
                SKU: {product.sku}
              </p>
            )}
          </div>
          
          {/* Descripción */}
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Descripción</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {product.description || 'No hay descripción disponible para este producto.'}
            </p>
          </div>
          
          {/* Acciones */}
          <div className="space-y-6 border-b border-gray-200 pb-6 mb-6">
            {/* Selector de cantidad */}
            <div>
              <h2 className="text-sm font-medium mb-2 text-gray-800">Cantidad</h2>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="text-gray-500 disabled:text-gray-300"
                  aria-label="Disminuir cantidad"
                >
                  <MinusCircle className="h-6 w-6" />
                </button>
                <span className="w-8 text-center font-medium text-gray-800">{quantity}</span>
                <button 
                  onClick={handleIncrement}
                  disabled={quantity >= 10}
                  className="text-gray-500 disabled:text-gray-300"
                  aria-label="Aumentar cantidad"
                >
                  <PlusCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex flex-col space-y-3">
              <button 
                onClick={handleAddToCart}
                className="flex items-center justify-center w-full py-3 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition shadow-sm"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Añadir al carrito
              </button>
              
              <div className="flex space-x-3">
                <button 
                  onClick={handleToggleFavorite}
                  className={`flex items-center justify-center flex-1 py-2 px-4 border rounded-lg transition ${isFavorite ? 'bg-red-50 text-red-600 border-red-300' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  <Heart className={`h-5 w-5 mr-2 ${isFavorite ? 'fill-red-600' : ''}`} />
                  {isFavorite ? 'Guardado' : 'Favorito'}
                </button>
                <button 
                  className="flex items-center justify-center flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  onClick={() => {
                    // Use Web Share API if available
                    if (navigator.share) {
                      navigator.share({
                        title: product?.name || 'Producto artesanal',
                        text: product?.description || 'Mira este increíble producto artesanal',
                        url: window.location.href
                      })
                      .catch(err => console.error('Error al compartir:', err));
                    } else {
                      // Fallback - copy to clipboard
                      navigator.clipboard.writeText(window.location.href);
                      alert('Enlace copiado al portapapeles');
                    }
                  }}
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Compartir
                </button>
              </div>
            </div>
          </div>
          
          {/* Detalles adicionales */}
          <div className="space-y-6">
            {/* Especificaciones */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-800">Especificaciones</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="py-1 border-b border-gray-100">
                      <span className="text-gray-600 text-sm">{key}: </span>
                      <span className="text-gray-900 font-medium text-sm">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Etiquetas */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-800">Etiquetas</h2>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Link 
                      key={index} 
                      href={`/products?tag=${tag}`}
                      className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm transition"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Características generales */}
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-800">Características</h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="text-teal-700 font-medium mr-2">•</span>
                  <span className="text-gray-800">Producto hecho a mano con materiales de calidad</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-700 font-medium mr-2">•</span>
                  <span className="text-gray-800">Diseño único y exclusivo</span>
                </li>
                <li className="flex items-start">
                  <span className="text-teal-700 font-medium mr-2">•</span>
                  <span className="text-gray-800">Artesanía local de Costa Rica</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reviews Section */}
      {!loading && !error && product && (
        <div className="mt-16 border-t border-gray-200 pt-10">
          <h2 className="text-2xl font-bold flex items-center mb-6 text-gray-800">
            <MessageSquare className="h-6 w-6 mr-2" />
            Reseñas y opiniones
          </h2>
          
          <div className="space-y-8">
            <ReviewsList productId={product.id} key={reviewsRefreshKey} />
            <ReviewForm 
              productId={product.id} 
              onReviewSubmitted={() => setReviewsRefreshKey(prev => prev + 1)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
