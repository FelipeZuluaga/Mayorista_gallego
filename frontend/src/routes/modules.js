export const modulesByRole = {
    ADMINISTRADOR: [
        { title: "Creaciòn de Usuarios", path: "/AdminDashboard/users", iconName: "Users" },
        { title: "Ingreso de Productos / Inventario", path: "/Inventory", iconName: "Package" },
        { title: "Despachos", path: "/despacho", iconName: "Truck" },
        { title: "Informe de rutas cargadas", path: "/pedidos", iconName: "ClipboardList" },
        { title: "Rutas", path: "/ventas", iconName: "LayoutDashboard" },
        { title: "Informe y proceso de Devolucion", path: "/historial-devoluciones", iconName: "RotateCcw" },
        { title: "Venta y liquidación de Rutas", path: "/historial-ventas", iconName: "BarChart3" },
        { title: "Informe de Clientes", path: "/clientes", iconName: "BarChart3" },
    

        { title: "Historial de pagos y liquidación semanal", path: "/historial-pagos", iconName: "Wallet" },
        { title: "Ganancias", path: "/ganancias", iconName: "ClipboardList"}
    ],
    DESPACHADOR: [
        { title: "Despachos", path: "/despacho", iconName: "Truck" },
        { title: "Informe de rutas cargadas", path: "/pedidos", iconName: "ClipboardList" },



        { title: "Informe y proceso de Devolucion", path: "/historial-devoluciones", iconName: "RotateCcw" },
    ],
    SOCIO: [
        { title: "Mis Rutas Cargadas", path: "/ventas", iconName: "Navigation" },
        { title: "Informe de mis rutas", path: "/historial-ventas", iconName: "TrendingUp" },
        { title: "Informe y proceso de Devolucion", path: "/historial-devoluciones", iconName: "RotateCcw" },
        { title: "Mis clientes", path: "/clientes", iconName: "BarChart3" },

        { title: "Pagos", path: "/historial-pagos", iconName: "Wallet" },
    ],
    NO_SOCIO: [
        { title: "Mis Rutas Cargadas", path: "/ventas", iconName: "Navigation" },
        { title: "Informe de mis rutas", path: "/historial-ventas", iconName: "TrendingUp" },
        { title: "Informe y proceso de Devolucion", path: "/historial-devoluciones", iconName: "RotateCcw" },
        { title: "Mis clientes", path: "/clientes", iconName: "BarChart3" },
        { title: "Pagos", path: "/historial-pagos", iconName: "Wallet" },
    ]
};