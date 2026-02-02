export const modulesByRole = {
    ADMINISTRADOR: [
        { title: "Usuarios", path: "/AdminDashboard/users", iconName: "Users" },
        { title: "Inventario", path: "/Inventory", iconName: "Package" },
        { title: "Crear pedido", path: "/despacho", iconName: "Truck" },
        { title: "Historial pedidos", path: "/pedidos", iconName: "ClipboardList" },

        // --- MEJORADO PARA ADMIN ---
        { title: "Control de Ventas", path: "/ventas", iconName: "LayoutDashboard" },
        { title: "Historial Global", path: "/historial-ventas", iconName: "BarChart3" },
        { title: "Devoluciones", path: "/devoluciones", iconName: "RefreshCcw" },

        { title: "Liquidación", path: "/liquidacion", iconName: "Calculator" },
        { title: "Pagos", path: "/pagos", iconName: "Wallet" },
    ],
    DESPACHADOR: [
        { title: "Crear pedido", path: "/despacho", iconName: "Truck" },
        { title: "Detalle mis pedidos", path: "/pedidos", iconName: "ClipboardList" },
    ],
    SOCIO: [
        { title: "Mis Pedidos", path: "/pedidos", iconName: "ClipboardList" },


        { title: "Mi Ruta Diaria", path: "/ventas", iconName: "Navigation" },
        { title: "Mis Ventas", path: "/historial-ventas", iconName: "TrendingUp" },
        { title: "Hacer Devoluciones", path: "/devoluciones", iconName: "RotateCcw" },
    ],
    NO_SOCIO: [
        { title: "Mis Pedidos", path: "/pedidos", iconName: "ClipboardList" },
        { title: "Hacer Ventas", path: "/ventas", iconName: "CircleDollarSign" },
        { title: "Mis Ventas", path: "/historial-ventas", iconName: "TrendingUp" },
        { title: "Hacer Devoluciones", path: "/devoluciones", iconName: "RotateCcw" },
    ]
};