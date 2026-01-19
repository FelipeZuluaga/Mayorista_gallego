export const modulesByRole = {
    ADMINISTRADOR: [
        { title: "Usuarios", path: "/AdminDashboard/users", iconName: "Users" },
        { title: "Inventario", path: "/Inventory", iconName: "Package" },
        { title: "Crear pedido", path: "/despacho", iconName: "PlusCircle" },
        { title: "Historial pedidos", path: "/pedidos", iconName: "FileSearch" },
        { title: "Hacer Ventas", path: "/ventas", iconName: "CircleDollarSign" },

        { title: "Historial Ventas", path: "/historial-ventas", iconName: "CircleDollarSign" },
        { title: "Devoluciones", path: "/devoluciones", iconName: "RefreshCcw" },
    ],
    DESPACHADOR: [
        { title: "Crear pedido", path: "/despacho", iconName: "PlusCircle" },
        { title: "Detalle mis pedidos", path: "/pedidos", iconName: "FileSearch" },
    ],
    SOCIO: [
        { title: "Mis Pedidos", path: "/pedidos", iconName: "ClipboardList" },
        { title: "Hacer Ventas", path: "/ventas", iconName: "CircleDollarSign" },
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