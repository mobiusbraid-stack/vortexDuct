/* File Path: apps/VortexDuct.ts
   Role: VortexDuct - Kinetic Human-Interface-Device to Fluid-Logic Bridge (FLL Native)
   System Standard: Law V (Syntropic Domain Braid) & Law VI (Phonon Induction Split)
   Core Math: Screen-Space Vector Projection, Viscous Force Spline Interpolation, Momentum Decay
*/

import { FlowField } from '../compiler/VortexAlgorithms';

export interface KineticNozzle {
    id: string;
    coordinateX: number; // Normalized coordinate X (-1.0 to 1.0)
    coordinateY: number; // Normalized coordinate Y (-1.0 to 1.0)
    forceVectorX: number;
    forceVectorY: number;
    radius: number;      // Broadness of the fluid disturbance
    decayRate: number;   // Viscous friction rate
}

export class VortexDuct {
    private readonly MASTER_CLOCK_HZ: number = 39420;
    private readonly DALETH: number = 0.106; // 10.6% damping baseline
    
    private activeNozzles: Map<string, KineticNozzle> = new Map();

    constructor() {
        console.log("🎛️ [VORTEX_DUCT] Fluidic input bridge active. Mapping screen kinetics to vector arrays.");
    }

    /**
     * Registers a new kinetic disturbance nozzle (mouse drag, pointer touch, or camera motion stream)
     */
    public injectNozzleForce(
        id: string, 
        normalizedX: number, 
        normalizedY: number, 
        forceX: number, 
        forceY: number, 
        radius: number = 0.15
    ): void {
        this.activeNozzles.set(id, {
            id,
            coordinateX: normalizedX,
            coordinateY: normalizedY,
            forceVectorX: forceX,
            forceVectorY: forceY,
            radius,
            decayRate: 1.0 - this.DALETH // Attenuate force along viscosity line
        });
    }

    /**
     * Injects the active nozzle pressures directly into the compiler's executable 2D velocity fields
     */
    public applyKineticForcesToField(field: FlowField): void {
        const res = field.resolution;

        this.activeNozzles.forEach((nozzle, id) => {
            // Apply standard coordinate mapping: (-1 to 1) -> (0 to resolution-1)
            const gridCX = Math.floor(((nozzle.coordinateX + 1.0) / 2.0) * res);
            const gridCY = Math.floor(((nozzle.coordinateY + 1.0) / 2.0) * res);
            const gridRadius = Math.ceil(nozzle.radius * res);

            // Compute distance-based advection on the surrounding cell array
            for (let y = -gridRadius; y <= gridRadius; y++) {
                for (let x = -gridRadius; x <= gridRadius; x++) {
                    const targetX = gridCX + x;
                    const targetY = gridCY + y;

                    if (targetX >= 0 && targetX < res && targetY >= 0 && targetY < res) {
                        const idx = targetX + targetY * res;
                        const distSq = x * x + y * y;
                        const radiusSq = gridRadius * gridRadius;

                        if (distSq <= radiusSq) {
                            // Quadratic falloff (closer cells feel more force)
                            const intensity = 1.0 - (distSq / (radiusSq + 1e-6));
                            
                            // Mix vector values directly into FLL instructions
                            field.u[idx] += nozzle.forceVectorX * intensity * 0.5;
                            field.v[idx] += nozzle.forceVectorY * intensity * 0.5;
                        }
                    }
                }
            }

            // Decay nozzle momentum over time
            nozzle.forceVectorX *= nozzle.decayRate;
            nozzle.forceVectorY *= nozzle.decayRate;

            // Purge dead/decayed nozzles
            if (Math.abs(nozzle.forceVectorX) < 1e-3 && Math.abs(nozzle.forceVectorY) < 1e-3) {
                this.activeNozzles.delete(id);
            }
        });
    }

    /**
     * Retrieve active coordinates for shader-layer interaction glow overlays
     */
    public getActiveNozzles(): KineticNozzle[] {
        return Array.from(this.activeNozzles.values());
    }
}
