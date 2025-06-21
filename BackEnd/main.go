package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

const (
	cpuProcFile      = "/proc/cpu_202201947"
	ramProcFile      = "/proc/ram_202201947"
	procesosProcFile = "/proc/procesos_202201947"
	port             = ":8080"
)

var (
	cpuData      string
	ramData      string
	procesosData string
	mu           sync.Mutex
)

func readProcFile(path string) (string, error) {
	data, err := os.ReadFile(path) // Reemplacé ioutil.ReadFile por os.ReadFile
	if err != nil {
		return "", fmt.Errorf("error al leer %s: %v", path, err)
	}
	return string(data), nil
}

func monitorCPU() {
	for {
		data, err := readProcFile(cpuProcFile)
		if err != nil {
			log.Printf("Error CPU: %v", err)
			mu.Lock()
			cpuData = fmt.Sprintf("Error: %v", err)
			mu.Unlock()
		} else {
			mu.Lock()
			cpuData = data
			mu.Unlock()
			log.Printf("[CPU] %s", data)
		}
		time.Sleep(5 * time.Second)
	}
}

func monitorRAM() {
	for {
		data, err := readProcFile(ramProcFile)
		if err != nil {
			log.Printf("Error RAM: %v", err)
			mu.Lock()
			ramData = fmt.Sprintf("Error: %v", err)
			mu.Unlock()
		} else {
			mu.Lock()
			ramData = data
			mu.Unlock()
			log.Printf("[RAM] %s", data)
		}
		time.Sleep(5 * time.Second)
	}
}

func monitorProcesos() {
	for {
		data, err := readProcFile(procesosProcFile)
		if err != nil {
			log.Printf("Error Procesos: %v", err)
			mu.Lock()
			procesosData = fmt.Sprintf("Error: %v", err)
			mu.Unlock()
		} else {
			mu.Lock()
			procesosData = data
			mu.Unlock()
			log.Printf("[Procesos] %s", data)
		}
		time.Sleep(5 * time.Second)
	}
}

// Estructuras para parsear los JSONs de entrada
type CPUData struct {
	PorcentajeUso float64 `json:"porcentajeUso"`
}

type RAMData struct {
	Total         int64   `json:"total"`
	Libre         int64   `json:"libre"`
	Uso           int64   `json:"uso"`
	PorcentajeUso float64 `json:"porcentajeUso"`
}

type ProcesosData struct {
	ProcesosCorriendo int `json:"procesos_corriendo"`
	TotalProcesos     int `json:"total_procesos"`
	ProcesosDurmiendo int `json:"procesos_durmiendo"`
	ProcesosZombie    int `json:"procesos_zombie"`
	ProcesosParados   int `json:"procesos_parados"`
}

// Estructura para la respuesta combinada
type CombinedMetrics struct {
	TotalRAM           int64   `json:"total_ram"`
	RAMLibre           int64   `json:"ram_libre"`
	UsoRAM             int64   `json:"uso_ram"`
	PorcentajeRAM      float64 `json:"porcentaje_ram"`
	PorcentajeCPUUso   float64 `json:"porcentaje_cpu_uso"`
	PorcentajeCPULibre float64 `json:"porcentaje_cpu_libre"`
	ProcesosCorriendo  int     `json:"procesos_corriendo"`
	TotalProcesos      int     `json:"total_procesos"`
	ProcesosDurmiendo  int     `json:"procesos_durmiendo"`
	ProcesosZombie     int     `json:"procesos_zombie"`
	ProcesosParados    int     `json:"procesos_parados"`
	Hora               string  `json:"hora"`
}

func main() {
	// Verify that the proc files exist
	if _, err := os.Stat(cpuProcFile); os.IsNotExist(err) {
		log.Fatalf("El módulo de CPU no está cargado. Verifica %s", cpuProcFile)
	}

	if _, err := os.Stat(ramProcFile); os.IsNotExist(err) {
		log.Fatalf("El módulo de RAM no está cargado. Verifica %s", ramProcFile)
	}

	if _, err := os.Stat(procesosProcFile); os.IsNotExist(err) {
		log.Fatalf("El módulo de procesos no está cargado. Verifica %s", procesosProcFile)
	}

	// Start monitoring goroutines
	go monitorCPU()
	go monitorRAM()
	go monitorProcesos()

	// Set up HTTP handlers
	http.HandleFunc("/cpu", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, cpuData)
	})

	http.HandleFunc("/ram", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, ramData)
	})

	http.HandleFunc("/procesos", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, procesosData)
	})

	http.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()

		// Parsear los datos de CPU
		var cpu CPUData
		if err := json.Unmarshal([]byte(cpuData), &cpu); err != nil {
			http.Error(w, fmt.Sprintf("Error parseando CPU data: %v", err), http.StatusInternalServerError)
			return
		}

		// Parsear los datos de RAM
		var ram RAMData
		if err := json.Unmarshal([]byte(ramData), &ram); err != nil {
			http.Error(w, fmt.Sprintf("Error parseando RAM data: %v", err), http.StatusInternalServerError)
			return
		}

		// Parsear los datos de procesos
		var procesos ProcesosData
		if err := json.Unmarshal([]byte(procesosData), &procesos); err != nil {
			http.Error(w, fmt.Sprintf("Error parseando Procesos data: %v", err), http.StatusInternalServerError)
			return
		}

		// Combinar los datos
		metrics := CombinedMetrics{
			TotalRAM:           ram.Total,
			RAMLibre:           ram.Libre,
			UsoRAM:             ram.Uso,
			PorcentajeRAM:      ram.PorcentajeUso,
			PorcentajeCPUUso:   cpu.PorcentajeUso,
			PorcentajeCPULibre: 100 - cpu.PorcentajeUso, // Asumimos que libre = 100 - uso
			ProcesosCorriendo:  procesos.ProcesosCorriendo,
			TotalProcesos:      procesos.TotalProcesos,
			ProcesosDurmiendo:  procesos.ProcesosDurmiendo,
			ProcesosZombie:     procesos.ProcesosZombie,
			ProcesosParados:    procesos.ProcesosParados,
			Hora:               time.Now().Format("2006-01-02 15:04:05"),
		}

		// Convertir a JSON
		response, err := json.Marshal(metrics)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error generando JSON: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(response)
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		io.WriteString(w, "OK")
	})

	// Start HTTP server
	log.Printf("Iniciando agente de monitoreo en puerto %s...", port)
	fmt.Printf("Métricas disponibles en http://localhost%s/cpu, http://localhost%s/ram, http://localhost%s/procesos y http://localhost%s/metrics\n", port, port, port, port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Error al iniciar el servidor HTTP: %v", err)
	}
}
