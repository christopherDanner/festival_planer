import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import { 
  Plus, 
  Minus, 
  Search, 
  Send, 
  Coffee, 
  Beer, 
  Utensils,
  Clock,
  CheckCircle
} from "lucide-react";

const menuItems = [
  { id: 1, name: "Schnitzel", category: "Essen", price: 12.50, icon: Utensils },
  { id: 2, name: "Bratwurst", category: "Essen", price: 4.50, icon: Utensils },
  { id: 3, name: "Bier 0,5l", category: "Getränke", price: 3.80, icon: Beer },
  { id: 4, name: "Radler 0,5l", category: "Getränke", price: 3.80, icon: Beer },
  { id: 5, name: "Kaffee", category: "Getränke", price: 2.20, icon: Coffee },
  { id: 6, name: "Apfelsaft", category: "Getränke", price: 2.50, icon: Coffee },
];

const tables = ["Tisch 1", "Tisch 2", "Tisch 3", "Bar", "Terrasse"];

export default function MobileWaiter() {
  const [cart, setCart] = useState<{[key: number]: number}>({});
  const [selectedTable, setSelectedTable] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderSent, setOrderSent] = useState(false);

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (itemId: number) => {
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((sum, count) => sum + count, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((total, [itemId, count]) => {
      const item = menuItems.find(item => item.id === parseInt(itemId));
      return total + (item?.price || 0) * count;
    }, 0);
  };

  const sendOrder = () => {
    if (selectedTable && getTotalItems() > 0) {
      console.log("Bestellung gesendet:", { table: selectedTable, items: cart });
      setOrderSent(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCart({});
        setSelectedTable("");
        setOrderSent(false);
      }, 2000);
    }
  };

  if (orderSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Bestellung gesendet!</h2>
            <p className="text-muted-foreground">
              Die Bestellung wurde an {selectedTable} weitergeleitet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Kellner-Modus</h1>
          <Badge variant="secondary" className="px-3 py-1">
            <Clock className="h-4 w-4 mr-1" />
            Feuerwehrfest 2024
          </Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Artikel suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-4 space-y-4 pb-32">
        {filteredItems.map((item) => (
          <Card key={item.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">€ {item.price.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {cart[item.id] ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                        className="h-8 w-8"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="font-medium w-8 text-center">
                        {cart[item.id]}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => addToCart(item.id)}
                        className="h-8 w-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => addToCart(item.id)}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Order Bar */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-4">
          {/* Table Selection */}
          <div className="grid grid-cols-5 gap-2">
            {tables.map((table) => (
              <Button
                key={table}
                variant={selectedTable === table ? "festival" : "outline"}
                size="sm"
                onClick={() => setSelectedTable(table)}
                className="text-xs"
              >
                {table}
              </Button>
            ))}
          </div>

          {/* Order Summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {getTotalItems()} Artikel • € {getTotalPrice().toFixed(2)}
              </p>
              {selectedTable && (
                <p className="text-sm text-muted-foreground">→ {selectedTable}</p>
              )}
            </div>
            
            <Button
              variant="festival"
              size="lg"
              onClick={sendOrder}
              disabled={!selectedTable}
              className="min-w-32"
            >
              <Send className="h-5 w-5 mr-2" />
              Senden
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}