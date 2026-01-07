import React, { useEffect, useState } from 'react';
import { Gift, Heart, ShoppingBag, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';
import { useAuth } from '../context/AuthContext';
import AuthGate from '../components/AuthGate';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['product_categories']['Row'];

const MarketPage: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const isLoggedIn = !!user;

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: cats } = await supabase.from('product_categories').select('*');
      if (cats) setCategories(cats);

      // Загружаем популярные товары (просто первые 10 для примера)
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('is_available', true)
        .limit(10);
        
      if (prods) setProducts(prods);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-6 pb-24 bg-gray-50 min-h-screen">
      <div className="px-6 mb-6">
        <h1 className="text-3xl font-black text-gray-900">BalaMarket</h1>
        <p className="text-gray-500 font-medium">Каталог товаров и благотворительность</p>
      </div>

      {/* Charity Banner */}
      <div className="mx-6 p-6 rounded-3xl bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-xl shadow-orange-200 mb-8 relative overflow-hidden group">
         <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
         <Gift className="w-10 h-10 mb-3 relative z-10" />
         <h3 className="text-xl font-bold mb-1 relative z-10">Отдам даром</h3>
         <p className="text-orange-100 text-sm mb-4 relative z-10 max-w-[80%]">Обменивайтесь вещами и помогайте другим семьям</p>
         <button 
            onClick={() => isLoggedIn ? alert('Раздел в разработке') : openAuthModal()}
            className="bg-white text-orange-600 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-lg active:scale-95 transition-all relative z-10"
         >
           {isLoggedIn ? 'Перейти' : 'Войти для доступа'}
         </button>
      </div>

      {/* Categories Grid */}
      <div className="px-6 mb-8">
        <h3 className="font-bold text-lg text-gray-800 mb-4">Категории</h3>
        {categories.length === 0 && !loading ? (
             <p className="text-gray-400 text-sm">Категории загружаются...</p>
        ) : (
            <div className="grid grid-cols-2 gap-4">
                {categories.map((cat) => (
                <div key={cat.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 border border-gray-100 hover:border-gray-300 transition-colors cursor-pointer active:scale-95">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl">
                    {cat.icon || '📦'}
                    </div>
                    <span className="font-bold text-gray-700 text-sm">{cat.name}</span>
                </div>
                ))}
            </div>
        )}
      </div>

      {/* Product List */}
      <div className="px-6">
        <h3 className="font-bold text-lg text-gray-800 mb-4">Популярное</h3>
        
        {loading ? (
            <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
        ) : products.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Товары скоро появятся</div>
        ) : (
            <div className="grid grid-cols-2 gap-4">
            {products.map((prod) => (
                <div key={prod.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full group">
                <div className="h-32 bg-gray-100 rounded-xl mb-3 relative overflow-hidden">
                    {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                             <ShoppingBag className="w-8 h-8" />
                        </div>
                    )}
                    <button 
                        onClick={() => isLoggedIn ? alert('Добавлено в избранное') : openAuthModal()}
                        className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <Heart className="w-4 h-4" />
                    </button>
                </div>
                
                <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 min-h-[40px]">{prod.name}</h4>
                
                {prod.contraindications && (
                    <p className="text-[10px] text-red-500 font-semibold bg-red-50 inline-block px-2 py-0.5 rounded-md mb-2 w-max max-w-full truncate">
                        Противопоказания
                    </p>
                )}
                
                <div className="mt-auto flex justify-between items-center pt-2">
                    <span className="font-black text-base text-gray-900">
                        {prod.approximate_price ? `${prod.approximate_price.toLocaleString()} ₸` : 'Цена?'}
                    </span>
                    <button 
                    onClick={() => isLoggedIn ? alert('Товар добавлен в корзину') : openAuthModal()}
                    className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center active:scale-90 transition-transform shadow-lg hover:bg-gray-800"
                    >
                        <ShoppingBag className="w-4 h-4" />
                    </button>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
      
      {!isLoggedIn && (
          <div className="mt-8 px-4">
              <AuthGate />
          </div>
      )}
    </div>
  );
};

export default MarketPage;