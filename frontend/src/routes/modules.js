export const modulesByRole = {
    ADMINISTRADOR: [
        { title: "Creación de Usuarios", path: "/AdminDashboard/users", iconName: "Users" },
        { title: "Informe de Clientes", path: "/clientes", iconName: "UserCheck" },
        { title: "Ingreso de Productos / Inventario", path: "/Inventory", iconName: "Package" },
        { title: "Despachos", path: "/despacho", iconName: "Truck" },
        { title: "Historial de Despachos Cargados", path: "/historialDespachos", iconName: "ClipboardList" },
        { title: "Historial y Proceso de Devolucion y Descuadres", path: "/historial-devoluciones", iconName: "RotateCcw" },
        { title: "Rutas", path: "/ventas", iconName: "Map" }, 
        { title: "Historial de Rutas y Liquidación Diaria", path: "/historial-ventas", iconName: "BarChart3" },
        { title: "Historial y Proceso de Pagos Semanal", path: "/historial-pagos", iconName: "Wallet" },
        { title: "Ganancias de la Empresa", path: "/ganancias", iconName: "DollarSign" },
    ],
    DESPACHADOR: [
        { title: "Mis Despachos", path: "/despacho", iconName: "Truck" },
        { title: "Historial de Mis Despachos cargadas", path: "/historialDespachos", iconName: "ClipboardList" },

        { title: "Informe y proc. de Mis Devolución", path: "/historial-devoluciones", iconName: "RotateCcw" },
    ],
    SOCIO: [

        //{ title: "Mis Productos Cargados a la Ruta", path: "/historialDespachos", iconName: "ClipboardList" },
        { title: "Informe de Mis Clientes", path: "/clientes", iconName: "UserCheck" }, // Cambiado a UserCheck (antes repetía BarChart3)
        { title: "Mis Rutas Cargadas", path: "/ventas", iconName: "Navigation" },
        { title: "Venta y liquidación de Mis Rutas", path: "/historial-ventas", iconName: "TrendingUp" },
        { title: "Informe y proceso de Devolucion", path: "/historial-devoluciones", iconName: "RotateCcw" },

        { title: "Historial y proceso de Mis pagos semanal", path: "/historial-pagos", iconName: "Wallet" },
    ],
    NO_SOCIO: [
        { title: "Informe de Mis Clientes", path: "/clientes", iconName: "UserCheck" }, // Cambiado a UserCheck (antes repetía BarChart3)
        { title: "Mis Rutas Cargadas", path: "/ventas", iconName: "Navigation" },
        { title: "Venta y liquidación de Mis Rutas", path: "/historial-ventas", iconName: "TrendingUp" },
        { title: "Informe y proceso de Devolucion", path: "/historial-devoluciones", iconName: "RotateCcw" },
        { title: "Historial y proceso de Mis pagos semanal", path: "/historial-pagos", iconName: "Wallet" },
    ]
};