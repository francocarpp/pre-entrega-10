const STORAGE_KEY = "simulador_guardias_fetch_estado";
const DATA_URL = "./data/guardias.json";

class Guardia {
    constructor(id, sector, valorHora, cuposDisponibles) {
        this.id = id;
        this.sector = sector;
        this.valorHora = Number(valorHora);
        this.cuposDisponibles = Number(cuposDisponibles);
    }
}

let guardias = [];

const formGuardia = document.querySelector("#form-guardia");
const inputSector = document.getElementById("input-sector");
const inputValor = document.getElementById("input-valor");
const inputCupos = document.getElementById("input-cupos");
const inputBuscar = document.querySelector("#input-buscar");
const btnCargarJson = document.getElementById("btn-cargar-json");
const estadoCarga = document.getElementById("estado-carga");
const contenedorGuardias = document.getElementById("contenedor-guardias");
const totalGuardiasEl = document.getElementById("total-guardias");
const totalValoresEl = document.getElementById("total-valores");

function notificarToast(title, icon = "success") {
    if (typeof Swal !== "undefined") {
        Swal.fire({
            toast: true,
            position: "top-end",
            icon,
            title,
            showConfirmButton: false,
            timer: 2600,
            timerProgressBar: true
        });
    }
}

function notificarError(mensaje) {
    if (typeof Swal !== "undefined") {
        Swal.fire({
            icon: "error",
            title: "Error en la operación",
            text: mensaje,
            confirmButtonColor: "#0f4c81"
        });
    }
}

function guardarEnStorage(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function leerStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed ?? null;
}

function actualizarResumen(lista) {
    totalGuardiasEl.textContent = lista.length;
    const sumaValores = lista.reduce((acc, { valorHora }) => acc + valorHora, 0);
    totalValoresEl.textContent = `$${sumaValores.toLocaleString("es-AR")}`;
}

function renderizarGuardias(lista, idResaltado = null) {
    contenedorGuardias.innerHTML = "";
    actualizarResumen(lista);

    if (lista.length === 0) {
        contenedorGuardias.innerHTML = `
            <div class="vacio-mensaje">
                <p>No se encontraron guardias que coincidan con la búsqueda.</p>
            </div>
        `;
        return;
    }

    lista.forEach((guardia) => {
        const { id, sector, valorHora, cuposDisponibles } = guardia;
        const claseExtra = id === idResaltado ? "destacada" : "";

        contenedorGuardias.innerHTML += `
            <article class="tarjeta-guardia ${claseExtra}" data-id="${id}">
                <div class="tarjeta-info">
                    <h3>${sector}</h3>
                    <p>Valor hora: $${valorHora.toLocaleString("es-AR")} — Cupos: ${cuposDisponibles}</p>
                </div>
                <button type="button" class="btn btn-eliminar" data-eliminar="${id}">Eliminar</button>
            </article>
        `;
    });

    contenedorGuardias.querySelectorAll(".btn-eliminar").forEach((boton) => {
        boton.addEventListener("click", () => {
            eliminarGuardia(Number(boton.dataset.eliminar));
        });
    });
}

async function obtenerGuardiasDesdeFetch(forzarRecargaJson = false) {
    estadoCarga.textContent = "Cargando guardias...";
    estadoCarga.classList.remove("oculto");
    btnCargarJson.disabled = true;

    try {
        const guardadasEnStorage = !forzarRecargaJson ? leerStorage() : null;

        if (guardadasEnStorage && guardadasEnStorage.length > 0) {
            guardias = guardadasEnStorage.map(
                ({ id, sector, valorHora, cuposDisponibles }) =>
                    new Guardia(id, sector, valorHora, cuposDisponibles)
            );
            renderizarGuardias(guardias);
            notificarToast("Guardias cargadas desde memoria local", "success");
            return;
        }

        const respuesta = await fetch(DATA_URL);
        if (!respuesta.ok) {
            throw new Error(`No se pudo obtener el archivo de datos (HTTP ${respuesta.status}).`);
        }

        const datosJson = await respuesta.json();
        guardias = datosJson.map(
            ({ id, sector, valorHora, cuposDisponibles }) =>
                new Guardia(id, sector, valorHora, cuposDisponibles)
        );

        guardarEnStorage(guardias);
        inputBuscar.value = "";
        renderizarGuardias(guardias);
        notificarToast("Guardias cargadas con éxito", "success");
    } catch (error) {
        const mensaje = error?.message ?? "No se pudieron cargar las guardias.";
        notificarError(mensaje);
    } finally {
        estadoCarga.classList.add("oculto");
        btnCargarJson.disabled = false;
    }
}

function eliminarGuardia(id) {
    try {
        const guardiaEliminada = guardias.find((item) => item.id === id);
        guardias = guardias.filter((item) => item.id !== id);
        guardarEnStorage(guardias);

        const textoFiltro = (inputBuscar?.value ?? "").trim().toLowerCase();
        const listaFiltrada = guardias.filter((item) =>
            item.sector.toLowerCase().includes(textoFiltro)
        );

        renderizarGuardias(listaFiltrada);

        const sectorEliminado = guardiaEliminada?.sector ?? "Guardia";
        notificarToast(`Se eliminó "${sectorEliminado}"`, "info");
    } catch {
        notificarError("No se pudo eliminar la guardia seleccionada.");
    }
}

formGuardia.addEventListener("submit", (evento) => {
    evento.preventDefault();

    try {
        const sector = inputSector.value.trim();
        const valorHora = Number(inputValor.value);
        const cupos = Number(inputCupos.value);

        if (!sector || isNaN(valorHora) || valorHora <= 0 || isNaN(cupos) || cupos < 0) {
            notificarError("Completá un sector válido, valor mayor a 0 y cupos de 0 o más.");
            return;
        }

        const nuevoId = guardias.length > 0 ? Math.max(...guardias.map(({ id }) => id)) + 1 : 1;
        const nuevaGuardia = new Guardia(nuevoId, sector, valorHora, cupos);

        guardias.push(nuevaGuardia);
        guardarEnStorage(guardias);

        inputBuscar.value = "";
        renderizarGuardias(guardias, nuevaGuardia.id);
        notificarToast(`Se agregó "${nuevaGuardia.sector}"`, "success");

        formGuardia.reset();
        inputSector.focus();
    } catch {
        notificarError("No se pudo agregar la guardia.");
    }
});

inputBuscar.addEventListener("keyup", () => {
    const termino = (inputBuscar?.value ?? "").trim().toLowerCase();
    const filtradas = guardias.filter((guardia) =>
        guardia.sector.toLowerCase().includes(termino)
    );
    renderizarGuardias(filtradas);
});

btnCargarJson.addEventListener("click", () => {
    obtenerGuardiasDesdeFetch(true);
});

obtenerGuardiasDesdeFetch(false);